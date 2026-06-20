import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { WorkoutStep } from '../domain/workoutSession';
import { AppSettings } from '../domain/settings';
import { calculateRemainingMs, calculateStepElapsedSeconds } from './TimerEngine';
import { HapticManager } from './HapticManager';
import beepSource from '../assets/sounds/beep.wav';

export class AudioCueManager {
  private spokenCueKeys = new Set<string>();
  private lastStepId: string | null = null;
  private speechBusy = false;
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
    try {
      await Speech.stop();
    } catch (error) {
      if (__DEV__) console.warn('Speech stop failed', error);
    } finally {
      this.speechBusy = false;
    }
  }

  private async speak(message: string, enabled: boolean): Promise<void> {
    if (!enabled || !message.trim() || this.speechBusy) return;
    this.speechBusy = true;
    try {
      await Speech.stop();
      Speech.speak(message, {
        language: 'ko-KR',
        pitch: 1,
        rate: 0.95,
        onDone: () => {
          this.speechBusy = false;
        },
        onStopped: () => {
          this.speechBusy = false;
        },
        onError: () => {
          this.speechBusy = false;
        },
      });
    } catch (error) {
      this.speechBusy = false;
      if (__DEV__) console.warn('Speech failed', error);
    }
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
