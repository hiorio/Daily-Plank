import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const SYNTHESIZE_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
// 합성이 이보다 오래 걸리면 운동 타이밍을 놓치므로 기기 음성으로 대체한다.
const SYNTHESIS_TIMEOUT_MS = 3500;
// didJustFinish 이벤트가 유실돼도 재생 대기가 큐 전체를 막지 않게 하는 안전장치.
const PLAYBACK_TIMEOUT_MS = 15000;

export class ChirpTtsEngine {
  private cache = new Map<string, string>();
  private pending = new Map<string, Promise<string | null>>();
  private activeStop: (() => void) | null = null;

  async prefetch(messages: string[], apiKey: string, voiceName: string): Promise<void> {
    await Promise.all(
      messages.map((message) => this.synthesize(message, apiKey, voiceName).catch(() => null)),
    );
  }

  async synthesize(message: string, apiKey: string, voiceName: string): Promise<string | null> {
    const key = `${voiceName}|${message}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const request = this.requestSynthesis(message, apiKey, voiceName)
      .then((audio) => {
        if (audio) this.cache.set(key, audio);
        return audio;
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, request);
    return request;
  }

  private async requestSynthesis(
    message: string,
    apiKey: string,
    voiceName: string,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNTHESIS_TIMEOUT_MS);
    try {
      const response = await fetch(`${SYNTHESIZE_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: message },
          voice: { languageCode: 'ko-KR', name: voiceName },
          audioConfig: { audioEncoding: 'MP3' },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (__DEV__) console.warn('Chirp HD synthesis failed', response.status);
        return null;
      }
      const payload = (await response.json()) as { audioContent?: string };
      return payload.audioContent ?? null;
    } catch (error) {
      if (__DEV__) console.warn('Chirp HD synthesis failed', error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async playAndWait(base64Mp3: string): Promise<void> {
    this.stop();
    await new Promise<void>((resolve) => {
      let player: AudioPlayer;
      try {
        player = createAudioPlayer({ uri: `data:audio/mpeg;base64,${base64Mp3}` });
      } catch (error) {
        if (__DEV__) console.warn('Chirp HD playback failed', error);
        resolve();
        return;
      }

      let settled = false;
      let subscription: { remove: () => void } | null = null;
      let safetyTimer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (this.activeStop === stopPlayback) this.activeStop = null;
        if (safetyTimer) clearTimeout(safetyTimer);
        try {
          subscription?.remove();
        } catch {
          // ignore
        }
        try {
          player.remove();
        } catch {
          // ignore
        }
        resolve();
      };
      const stopPlayback = () => {
        try {
          player.pause();
        } catch {
          // ignore
        }
        finish();
      };

      this.activeStop = stopPlayback;
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) finish();
      });
      safetyTimer = setTimeout(finish, PLAYBACK_TIMEOUT_MS);
      try {
        player.play();
      } catch (error) {
        if (__DEV__) console.warn('Chirp HD playback failed', error);
        finish();
      }
    });
  }

  stop(): void {
    const stop = this.activeStop;
    this.activeStop = null;
    stop?.();
  }
}
