import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { SpeechOptions, Voice, VoiceQuality } from 'expo-speech';
import { WorkoutStep } from '../domain/workoutSession';
import { AppSettings } from '../domain/settings';
import { calculateRemainingMs, calculateStepElapsedSeconds } from './TimerEngine';
import { ChirpTtsEngine } from './ChirpTtsEngine';
import { HapticManager } from './HapticManager';
import beepSource from '../assets/sounds/beep.wav';

// 제 시각을 이만큼 넘겨 발견된 큐(백그라운드 복귀, 구간 이동 직후 등)는
// 이미 늦었으므로 소리 내지 않고 소비해서 이후 안내가 밀리지 않게 한다.
const CUE_LATE_TOLERANCE_SECONDS = 2;
const STEP_START_LATE_TOLERANCE_MS = 3000;
// 마지막 카운트다운(3-2-1)은 진행 중인 음성을 끊고서라도 박자를 지킨다.
const PREEMPTIVE_COUNTDOWN_THRESHOLD_SECONDS = 3;

interface SpeechRequest {
  message: string;
  settings: AppSettings;
}

export class AudioCueManager {
  private spokenCueKeys = new Set<string>();
  private lastStepId: string | null = null;
  private speechQueue: SpeechRequest[] = [];
  private speechBusy = false;
  private speechEpoch = 0;
  private preferredVoicePromise: Promise<string | undefined> | null = null;
  private player: AudioPlayer | null = null;
  private haptics = new HapticManager();
  private chirp = new ChirpTtsEngine();

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
      this.interruptSpeech();
    }
  }

  async playStepStart(
    step: WorkoutStep,
    settings: AppSettings,
    stepStartedAt?: number | null,
    nextStep?: WorkoutStep | null,
  ): Promise<void> {
    this.resetForStep(step);
    const key = `${step.id}:start`;
    if (this.spokenCueKeys.has(key)) return;
    this.spokenCueKeys.add(key);

    this.prefetchStepSpeech(step, nextStep ?? null, settings);

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

      const firedLate =
        (cue.remainingSeconds != null &&
          remainingSeconds < cue.remainingSeconds - CUE_LATE_TOLERANCE_SECONDS) ||
        (cue.elapsedSeconds != null &&
          elapsedSeconds > cue.elapsedSeconds + CUE_LATE_TOLERANCE_SECONDS);
      if (firedLate) continue;

      if (cue.cueType === 'VOICE') {
        const preempt =
          cue.remainingSeconds != null &&
          cue.remainingSeconds <= PREEMPTIVE_COUNTDOWN_THRESHOLD_SECONDS;
        await this.speak(cue.message, settings, { preempt });
      }
      if (cue.cueType === 'SOUND') await this.playSound(settings.soundEnabled);
      if (cue.cueType === 'HAPTIC') await this.haptics.tick(settings.hapticEnabled);
    }
  }

  async stopSpeech(): Promise<void> {
    this.interruptSpeech();
  }

  dispose(): void {
    this.interruptSpeech();
    try {
      this.player?.remove();
    } catch (error) {
      if (__DEV__) console.warn('Audio player release failed', error);
    }
    this.player = null;
  }

  async previewVoice(settings: AppSettings): Promise<void> {
    await this.speak(
      '음성 안내 테스트입니다. 운동 중에는 다음 동작과 남은 시간을 이렇게 안내합니다.',
      settings,
      { preempt: true },
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

  private interruptSpeech(): void {
    this.speechEpoch += 1;
    this.speechQueue = [];
    this.chirp.stop();
    void Speech.stop().catch((error) => {
      if (__DEV__) console.warn('Speech stop failed', error);
    });
  }

  private prefetchStepSpeech(
    step: WorkoutStep,
    nextStep: WorkoutStep | null,
    settings: AppSettings,
  ): void {
    if (!settings.voiceEnabled || !this.isHdVoiceReady(settings)) return;

    const messages = new Set<string>();
    messages.add((step.startMessage ?? step.title).trim());
    for (const cue of step.cues ?? []) {
      if (cue.cueType === 'VOICE') messages.add(cue.message.trim());
    }
    if (nextStep) messages.add((nextStep.startMessage ?? nextStep.title).trim());

    void this.chirp.prefetch(
      [...messages].filter((message) => message.length > 0),
      settings.googleTtsApiKey.trim(),
      settings.hdVoiceName,
    );
  }

  private async speak(
    message: string,
    settings: AppSettings,
    options?: { preempt?: boolean },
  ): Promise<void> {
    const trimmedMessage = message.trim();
    if (!settings.voiceEnabled || !trimmedMessage) return;
    if (options?.preempt) this.interruptSpeech();
    this.speechQueue.push({ message: trimmedMessage, settings });
    await this.processSpeechQueue();
  }

  private async processSpeechQueue(): Promise<void> {
    if (this.speechBusy) return;
    this.speechBusy = true;

    try {
      while (this.speechQueue.length > 0) {
        const request = this.speechQueue.shift();
        if (!request) continue;
        await this.speakOnce(request, this.speechEpoch);
      }
    } catch (error) {
      if (__DEV__) console.warn('Speech failed', error);
    } finally {
      this.speechBusy = false;
    }

    // busy 해제 직전에 새 메시지가 들어온 경우 놓치지 않게 한 번 더 돈다.
    if (this.speechQueue.length > 0) {
      void this.processSpeechQueue();
    }
  }

  private async speakOnce(request: SpeechRequest, epoch: number): Promise<void> {
    if (epoch !== this.speechEpoch) return;
    const { message, settings } = request;

    if (this.isHdVoiceReady(settings)) {
      const audio = await this.chirp.synthesize(
        message,
        settings.googleTtsApiKey.trim(),
        settings.hdVoiceName,
      );
      if (epoch !== this.speechEpoch) return;
      if (audio) {
        await this.chirp.playAndWait(audio);
        return;
      }
    }

    await this.speakWithDeviceVoice(message, epoch);
  }

  private isHdVoiceReady(settings: AppSettings): boolean {
    return settings.hdVoiceEnabled && settings.googleTtsApiKey.trim().length > 0;
  }

  private async speakWithDeviceVoice(message: string, epoch: number): Promise<void> {
    const voice = await this.getPreferredKoreanVoice();
    if (epoch !== this.speechEpoch) return;
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
    // 카운트다운 숫자는 1초 안에 끝나야 타이머와 박자가 맞는다.
    if (/^[0-9]+$/.test(message)) return 1.0;
    if (message.length <= 6) return 0.92;
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
  const identifier = voice.identifier.toLowerCase();
  let score = 0;

  if (name.includes('chirp') || identifier.includes('chirp')) score += 60;
  if (voice.quality === VoiceQuality.Enhanced) score += 50;
  if (name.includes('hd') || identifier.includes('hd')) score += 24;
  if ('localService' in voice && voice.localService) score += 20;
  if ('isDefault' in voice && voice.isDefault) score += 15;
  if (name.includes('natural')) score += 14;
  if (name.includes('siri')) score += 12;
  if (identifier.includes('network') || name.includes('premium')) score += 11;
  if (name.includes('google')) score += 10;
  if (name.includes('microsoft')) score += 8;
  if (name.includes('yuna') || name.includes('heami') || name.includes('sunhi')) score += 6;

  return score;
}
