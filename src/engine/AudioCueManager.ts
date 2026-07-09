import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { WorkoutCue, WorkoutStep } from '../domain/workoutSession';
import { AppSettings, defaultTtsVoiceId, TtsVoiceId } from '../domain/settings';
import { HapticManager } from './HapticManager';
import beepSource from '../assets/sounds/beep.wav';
import { polishSpeechMessage } from './speechText';
import { generatedTtsAssets } from '../assets/tts/googleTtsAssets';
import { COUNTDOWN_TRACK_MESSAGE, COUNTDOWN_TRACK_PLAYBACK_MS } from '../domain/countdown';
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
  private countdownEpoch = 0;
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

  private async interruptSpeech(options: { clearCountdownTimers?: boolean } = {}): Promise<void> {
    const clearCountdownTimers = options.clearCountdownTimers ?? true;
    this.speechEpoch += 1;
    this.speechQueue = [];
    if (clearCountdownTimers) this.clearCountdownTimers();
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
    if (options?.preempt) await this.interruptSpeech({ clearCountdownTimers: false });
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

    const countdownEpoch = this.countdownEpoch;

    for (const cue of countdownCues) {
      const timeout = setTimeout(() => {
        if (countdownEpoch !== this.countdownEpoch) return;
        void this.startCountdownTrack(cue.message, settings.ttsVoiceId, countdownEpoch);
      }, cue.delayMs);
      this.countdownTimeouts.push(timeout);
    }
  }

  private async startCountdownTrack(
    message: string,
    voiceId: TtsVoiceId,
    scheduledCountdownEpoch: number,
  ): Promise<void> {
    if (scheduledCountdownEpoch !== this.countdownEpoch) return;
    await this.interruptSpeech({ clearCountdownTimers: false });
    await this.playCountdownTrack(message, voiceId, this.speechEpoch);
  }

  private async playCountdownTrack(
    message: string,
    voiceId: TtsVoiceId,
    epoch: number,
  ): Promise<void> {
    if (epoch !== this.speechEpoch) return;
    const generatedSpeechPlayed = await this.playGeneratedSpeech(message, voiceId);
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

    if (__DEV__) {
      console.warn(`Generated speech is missing or failed. System TTS fallback is disabled: ${message}`);
    }
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
  ): Promise<boolean> {
    const voicePack = generatedTtsAssets[voiceId] ?? generatedTtsAssets[defaultTtsVoiceId];
    const fallbackVoicePack = generatedTtsAssets[defaultTtsVoiceId];
    const source = voicePack[message] ?? fallbackVoicePack[message];
    if (!source) return false;

    try {
      await ensurePlaybackAudioMode();
      await this.playAudioSource(source, message);
      return true;
    } catch (error) {
      if (__DEV__) console.warn('Generated speech playback failed', error);
      return false;
    }
  }

  private async playAudioSource(
    source: AudioSource,
    message: string,
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

      startPlayback();

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
    this.countdownEpoch += 1;
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
  if (message === COUNTDOWN_TRACK_MESSAGE) return COUNTDOWN_TRACK_PLAYBACK_MS + 1500;

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
