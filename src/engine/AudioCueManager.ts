import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { SpeechOptions, Voice, VoiceQuality } from 'expo-speech';
import { WorkoutStep } from '../domain/workoutSession';
import { AppSettings } from '../domain/settings';
import { calculateRemainingMs, calculateStepElapsedSeconds } from './TimerEngine';
import { HapticManager } from './HapticManager';
import beepSource from '../assets/sounds/beep.wav';

export class AudioCueManager {
  private spokenCueKeys = new Set<string>();
  private lastStepId: string | null = null;
  private speechQueue: string[] = [];
  private speechBusy = false;
  private preferredVoicePromise: Promise<string | undefined> | null = null;
  private player: AudioPlayer | null = null;
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
      void this.stopSpeech();
    }
  }

  async playStepStart(step: WorkoutStep, settings: AppSettings): Promise<void> {
    this.resetForStep(step);
    const key = `${step.id}:start`;
    if (this.spokenCueKeys.has(key)) return;
    this.spokenCueKeys.add(key);

    await Promise.all([
      this.speak(step.startMessage ?? step.title, settings.voiceEnabled),
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

    const elapsedSeconds = calculateStepElapsedSeconds(stepStartedAt, now);
    const remainingSeconds = Math.ceil(calculateRemainingMs(stepEndsAt, now) / 1000);

    for (const cue of step.cues) {
      if (cue.remainingSeconds === 10 && !settings.tenSecondCueEnabled) continue;
      if (
        cue.remainingSeconds != null &&
        cue.remainingSeconds <= 3 &&
        !settings.countdownCueEnabled
      ) {
        continue;
      }

      const shouldFire =
        (cue.elapsedSeconds != null && elapsedSeconds >= cue.elapsedSeconds) ||
        (cue.remainingSeconds != null && remainingSeconds <= cue.remainingSeconds);

      const key = `${step.id}:${cue.elapsedSeconds ?? 'r'}:${cue.remainingSeconds ?? 'e'}:${cue.message}`;
      if (!shouldFire || this.spokenCueKeys.has(key)) continue;
      this.spokenCueKeys.add(key);

      if (cue.cueType === 'VOICE') await this.speak(cue.message, settings.voiceEnabled);
      if (cue.cueType === 'SOUND') await this.playSound(settings.soundEnabled);
      if (cue.cueType === 'HAPTIC') await this.haptics.tick(settings.hapticEnabled);
    }
  }

  async stopSpeech(): Promise<void> {
    this.speechQueue = [];
    try {
      await Speech.stop();
    } catch (error) {
      if (__DEV__) console.warn('Speech stop failed', error);
    } finally {
      this.speechBusy = false;
    }
  }

  private async speak(message: string, enabled: boolean): Promise<void> {
    const trimmedMessage = message.trim();
    if (!enabled || !trimmedMessage) return;
    this.speechQueue.push(trimmedMessage);
    await this.processSpeechQueue();
  }

  private async processSpeechQueue(): Promise<void> {
    if (this.speechBusy) return;
    this.speechBusy = true;

    try {
      while (this.speechQueue.length > 0) {
        const nextMessage = this.speechQueue.shift();
        if (!nextMessage) continue;
        await this.speakOnce(nextMessage);
      }
    } catch (error) {
      if (__DEV__) console.warn('Speech failed', error);
    } finally {
      this.speechBusy = false;
    }
  }

  private async speakOnce(message: string): Promise<void> {
    const voice = await this.getPreferredKoreanVoice();
    await new Promise<void>((resolve) => {
      try {
        const options: SpeechOptions = {
          language: 'ko-KR',
          pitch: 1.02,
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
    if (/^[0-9]+$/.test(message)) return 0.82;
    if (message.length <= 6) return 0.88;
    return 0.9;
  }

  private async playSound(enabled: boolean): Promise<void> {
    if (!enabled || !this.player) return;
    try {
      this.player.seekTo(0);
      this.player.play();
    } catch (error) {
      if (__DEV__) console.warn('Sound playback failed', error);
    }
  }
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
  if (name.includes('natural')) score += 14;
  if (name.includes('siri')) score += 12;
  if (name.includes('google')) score += 10;
  if (name.includes('microsoft')) score += 8;
  if (name.includes('yuna') || name.includes('heami') || name.includes('sunhi')) score += 6;

  return score;
}
