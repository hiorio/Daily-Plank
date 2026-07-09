import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';
import * as Speech from 'expo-speech';
import { SpeechOptions, Voice, VoiceQuality } from 'expo-speech';
import { Platform } from 'react-native';
import type { WorkoutCue, WorkoutStep } from '../domain/workoutSession';
import { AppSettings, defaultTtsVoiceId, TtsVoiceId } from '../domain/settings';
import { HapticManager } from './HapticManager';
import beepSource from '../assets/sounds/beep.wav';
import { polishSpeechMessage } from './speechText';
import { generatedTtsAssets } from '../assets/tts/googleTtsAssets';
import {
  getCountdownCueSchedule,
  getTimedCueState,
  isCountdownCueMessage,
} from './AudioCueTiming';

interface QueuedSpeech {
  message: string;
  voiceId: TtsVoiceId;
}

let playbackAudioModePromise: Promise<void> | null = null;
const STEP_START_LATE_TOLERANCE_MS = 3000;

export class AudioCueManager {
  private spokenCueKeys = new Set<string>();
  private lastStepId: string | null = null;
  private speechQueue: QueuedSpeech[] = [];
  private speechBusy = false;
  private speechEpoch = 0;
  private preferredVoicePromise: Promise<string | undefined> | null = null;
  private player: AudioPlayer | null = null;
  private generatedSpeechPlayer: AudioPlayer | null = null;
  private resolveGeneratedSpeech: (() => void) | null = null;
  private countdownTimeouts: ReturnType<typeof setTimeout>[] = [];
  private haptics = new HapticManager();

  constructor() {
    try {
      this.player = createAudioPlayer(beepSource);
    } catch (error) {
      if (__DEV__) console.warn('Audio player initialization failed', error);
    }
  }

  resetForStep(step: WorkoutStep): void {
    if (this.lastStepId !== step.id) {
      this.lastStepId = step.id;
      this.spokenCueKeys.clear();
      void this.interruptSpeech();
    }
  }

  async playStepStart(
    step: WorkoutStep,
    settings: AppSettings,
    stepStartedAt?: number | null,
  ): Promise<void> {
    this.resetForStep(step);
    const key = `${step.id}:start`;
    if (this.spokenCueKeys.has(key)) return;
    this.spokenCueKeys.add(key);

    if (stepStartedAt != null && Date.now() - stepStartedAt > STEP_START_LATE_TOLERANCE_MS) {
      return;
    }

    await Promise.all([
      this.speak(step.startMessage ?? step.title, settings, { preempt: true }),
      this.playSound(settings.soundEnabled),
      this.haptics.notify(settings.hapticEnabled),
    ]);
  }

  async evaluateStepCues(
    step: WorkoutStep,
    stepStartedAt: number,
    stepEndsAt: number,
    now: number,
    settings: AppSettings,
  ): Promise<void> {
    if (!step.cues?.length) return;
    this.resetForStep(step);
    await this.maybeStartCountdownTrack(step, stepEndsAt, now, settings);

    for (const cue of step.cues) {
      if (cue.cueType === 'VOICE' && isCountdownCueMessage(cue.message, cue.remainingSeconds)) {
        continue;
      }
      if (cue.remainingSeconds === 10 && !settings.tenSecondCueEnabled) continue;
      if (
        cue.remainingSeconds != null &&
        cue.remainingSeconds <= 3 &&
        !settings.countdownCueEnabled
      ) {
        continue;
      }

      const key = getSpokenCueKey(step.id, cue);
      if (this.spokenCueKeys.has(key)) continue;

      const cueState = getTimedCueState(
        cue,
        stepStartedAt,
        stepEndsAt,
        now,
      );
      if (cueState === 'PENDING') continue;

      this.spokenCueKeys.add(key);
      if (cueState === 'EXPIRED') continue;

      if (cue.cueType === 'VOICE') {
        await this.speak(cue.message, settings, {
          preempt: cue.remainingSeconds != null,
          skipIfBusy: cue.elapsedSeconds != null,
        });
      }
      if (cue.cueType === 'SOUND') await this.playSound(settings.soundEnabled);
      if (cue.cueType === 'HAPTIC') await this.haptics.tick(settings.hapticEnabled);
    }
  }

  async stopSpeech(): Promise<void> {
    await this.interruptSpeech();
  }

  dispose(): void {
    void this.interruptSpeech();
    try {
      this.player?.remove();
    } catch (error) {
      if (__DEV__) console.warn('Audio player release failed', error);
    }
    this.player = null;
  }

  async previewVoice(settings: AppSettings): Promise<void> {
    await this.speak(
      '음성 안내 테스트입니다. 운동 중에는 다음 동작과 남은 시간을 부드럽게 안내해 드립니다.',
      settings,
    );
  }

  async previewSound(settings: AppSettings): Promise<void> {
    await this.playSound(settings.soundEnabled);
  }

  async previewHaptic(settings: AppSettings): Promise<void> {
    await this.haptics.tick(settings.hapticEnabled);
  }

  async previewAll(settings: AppSettings): Promise<void> {
    await Promise.all([
      this.previewSound(settings),
      this.previewHaptic(settings),
      this.previewVoice(settings),
    ]);
  }

  private async interruptSpeech(): Promise<void> {
    this.speechEpoch += 1;
    this.speechQueue = [];
    this.clearCountdownTimers();
    this.stopGeneratedSpeech();
    try {
      await Speech.stop();
    } catch (error) {
      if (__DEV__) console.warn('Speech stop failed', error);
    }
  }

  private async speak(
    message: string,
    settings: AppSettings,
    options?: { preempt?: boolean; skipIfBusy?: boolean },
  ): Promise<void> {
    const trimmedMessage = polishSpeechMessage(message);
    if (!settings.voiceEnabled || !trimmedMessage) return;
    if (options?.preempt) await this.interruptSpeech();
    if (options?.skipIfBusy && (this.speechBusy || this.speechQueue.length > 0)) return;
    this.speechQueue.push({ message: trimmedMessage, voiceId: settings.ttsVoiceId });
    await this.processSpeechQueue();
  }

  private async maybeStartCountdownTrack(
    step: WorkoutStep,
    stepEndsAt: number,
    now: number,
    settings: AppSettings,
  ): Promise<void> {
    if (!settings.countdownCueEnabled || !settings.voiceEnabled) return;

    const key = `${step.id}:countdown-sequence`;
    if (this.spokenCueKeys.has(key)) return;

    const countdownCues = getCountdownCueSchedule(step.cues ?? [], stepEndsAt, now);
    if (countdownCues.length === 0) return;

    this.spokenCueKeys.add(key);
    for (const cue of countdownCues) {
      this.spokenCueKeys.add(getSpokenCueKey(step.id, cue.cue));
    }

    await this.interruptSpeech();
    const epoch = this.speechEpoch;

    for (const cue of countdownCues) {
      const timeout = setTimeout(() => {
        if (epoch !== this.speechEpoch) return;
        void this.playCountdownTrack(cue.message, settings.ttsVoiceId, cue.seekOffsetMs, epoch);
      }, cue.delayMs);
      this.countdownTimeouts.push(timeout);
    }
  }

  private async playCountdownTrack(
    message: string,
    voiceId: TtsVoiceId,
    seekOffsetMs: number,
    epoch: number,
  ): Promise<void> {
    if (epoch !== this.speechEpoch) return;
    const generatedSpeechPlayed = await this.playGeneratedSpeech(message, voiceId, seekOffsetMs);
    if (!generatedSpeechPlayed && __DEV__) {
      console.warn(`Countdown track is missing for voice ${voiceId}.`);
    }
  }

  private async processSpeechQueue(): Promise<void> {
    if (this.speechBusy) return;
    this.speechBusy = true;
    const epoch = this.speechEpoch;

    try {
      while (this.speechQueue.length > 0 && epoch === this.speechEpoch) {
        const nextSpeech = this.speechQueue.shift();
        if (!nextSpeech) continue;
        await this.speakOnce(nextSpeech, epoch);
      }
    } catch (error) {
      if (__DEV__) console.warn('Speech failed', error);
    } finally {
      this.speechBusy = false;
    }

    if (this.speechQueue.length > 0) {
      void this.processSpeechQueue();
    }
  }

  private async speakOnce({ message, voiceId }: QueuedSpeech, epoch: number): Promise<void> {
    if (epoch !== this.speechEpoch) return;
    const generatedSpeechPlayed = await this.playGeneratedSpeech(message, voiceId);
    if (epoch !== this.speechEpoch) return;
    if (generatedSpeechPlayed) return;

    const voice = await this.getPreferredKoreanVoice();
    if (epoch !== this.speechEpoch) return;
    await new Promise<void>((resolve) => {
      try {
        const options: SpeechOptions = {
          language: 'ko-KR',
          pitch: 1,
          rate: this.getNaturalRate(message),
          volume: 1,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => resolve(),
        };
        if (voice) options.voice = voice;
        Speech.speak(message, options);
      } catch (error) {
        if (__DEV__) console.warn('Speech failed', error);
        resolve();
      }
    });
  }

  private getPreferredKoreanVoice(): Promise<string | undefined> {
    if (!this.preferredVoicePromise) {
      this.preferredVoicePromise = Speech.getAvailableVoicesAsync()
        .then((voices) => selectPreferredKoreanVoice(voices))
        .catch((error) => {
          if (__DEV__) console.warn('Korean voice lookup failed', error);
          return undefined;
        });
    }
    return this.preferredVoicePromise;
  }

  private getNaturalRate(message: string): number {
    if (/^[0-9]+$/.test(message)) return 1;
    if (message.length <= 6) return 0.92;
    if (message.length <= 18) return 0.9;
    return 0.88;
  }

  private async playSound(enabled: boolean): Promise<void> {
    if (!enabled || !this.player) return;
    if (Platform.OS === 'web') return;
    try {
      await ensurePlaybackAudioMode();
      this.player.seekTo(0);
      this.player.play();
    } catch (error) {
      if (__DEV__) console.warn('Sound playback failed', error);
    }
  }

  private async playGeneratedSpeech(
    message: string,
    voiceId: TtsVoiceId,
    seekOffsetMs = 0,
  ): Promise<boolean> {
    const voicePack = generatedTtsAssets[voiceId] ?? generatedTtsAssets[defaultTtsVoiceId];
    const fallbackVoicePack = generatedTtsAssets[defaultTtsVoiceId];
    const source = voicePack[message] ?? fallbackVoicePack[message];
    if (!source) return false;

    try {
      await ensurePlaybackAudioMode();
      await this.playAudioSource(source, message, seekOffsetMs);
      return true;
    } catch (error) {
      if (__DEV__) console.warn('Generated speech playback failed', error);
      return false;
    }
  }

  private async playAudioSource(
    source: AudioSource,
    message: string,
    seekOffsetMs = 0,
  ): Promise<void> {
    this.stopGeneratedSpeech();

    await new Promise<void>((resolve, reject) => {
      const player = createAudioPlayer(source, {
        keepAudioSessionActive: false,
        updateInterval: 100,
      });
      this.generatedSpeechPlayer = player;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let settled = false;
      let subscription: { remove: () => void } | null = null;
      let heardPlaybackSignal = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        subscription?.remove();
        try {
          player.pause();
          player.seekTo(0).catch(() => undefined);
          player.remove();
        } catch {
          // Ignore cleanup errors so TTS can fall back cleanly.
        }
        if (this.generatedSpeechPlayer === player) this.generatedSpeechPlayer = null;
        if (this.resolveGeneratedSpeech === resolvePlayback) this.resolveGeneratedSpeech = null;
      };

      const resolvePlayback = () => {
        cleanup();
        resolve();
      };

      const rejectPlayback = (error: Error) => {
        cleanup();
        reject(error);
      };

      this.resolveGeneratedSpeech = resolvePlayback;
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing || status.currentTime > 0 || status.didJustFinish) {
          heardPlaybackSignal = true;
        }
        if (status.didJustFinish) {
          setTimeout(resolvePlayback, 120);
          return;
        }
        if (status.error) rejectPlayback(new Error(String(status.error)));
      });

      const startPlayback = () => {
        try {
          player.play();
        } catch (error) {
          rejectPlayback(error instanceof Error ? error : new Error('Generated speech play failed.'));
        }
      };

      const seekOffsetSeconds = Math.max(0, seekOffsetMs / 1000);
      if (seekOffsetSeconds > 0) {
        player.seekTo(seekOffsetSeconds).then(startPlayback).catch((error) => {
          rejectPlayback(error instanceof Error ? error : new Error('Generated speech seek failed.'));
        });
      } else {
        startPlayback();
      }

      const fallbackDurationMs = Math.max(
        estimateSpeechDurationMs(message),
        (player.duration || 0) * 1000 + 1800,
      );
      timeoutId = setTimeout(() => {
        if (heardPlaybackSignal) {
          resolvePlayback();
          return;
        }
        rejectPlayback(new Error('Generated speech did not start.'));
      }, fallbackDurationMs);
    });
  }

  private stopGeneratedSpeech(): void {
    this.resolveGeneratedSpeech?.();
  }

  private clearCountdownTimers(): void {
    for (const timeout of this.countdownTimeouts) {
      clearTimeout(timeout);
    }
    this.countdownTimeouts = [];
  }
}

function ensurePlaybackAudioMode(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();

  if (!playbackAudioModePromise) {
    playbackAudioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch((error) => {
      playbackAudioModePromise = null;
      throw error;
    });
  }

  return playbackAudioModePromise;
}

function estimateSpeechDurationMs(message: string): number {
  const digitOnly = /^[0-9]+$/.test(message);
  if (digitOnly) return 1600;

  const estimated = message.length * 190 + 1800;
  return Math.min(15000, Math.max(4500, estimated));
}

function getSpokenCueKey(
  stepId: string,
  cue: Pick<WorkoutCue, 'elapsedSeconds' | 'message' | 'remainingSeconds'>,
): string {
  return `${stepId}:${cue.elapsedSeconds ?? 'r'}:${cue.remainingSeconds ?? 'e'}:${cue.message}`;
}

function selectPreferredKoreanVoice(voices: Voice[]): string | undefined {
  const koreanVoices = voices.filter((voice) => voice.language.toLowerCase().startsWith('ko'));
  if (koreanVoices.length === 0) return undefined;

  return [...koreanVoices].sort((left, right) => scoreVoice(right) - scoreVoice(left))[0]?.identifier;
}

function scoreVoice(voice: Voice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (voice.quality === VoiceQuality.Enhanced) score += 50;
  if ('localService' in voice && voice.localService) score += 20;
  if ('isDefault' in voice && voice.isDefault) score += 15;
  if (name.includes('premium')) score += 18;
  if (name.includes('neural')) score += 16;
  if (name.includes('natural')) score += 14;
  if (name.includes('siri')) score += 12;
  if (name.includes('google')) score += 10;
  if (name.includes('microsoft')) score += 8;
  if (name.includes('yuna') || name.includes('heami') || name.includes('sunhi')) score += 6;

  return score;
}
