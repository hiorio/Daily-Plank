export interface AppSettings {
  voiceEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  tenSecondCueEnabled: boolean;
  countdownCueEnabled: boolean;
  keepAwakeEnabled: boolean;
  detailedGuideEnabled: boolean;
  hdVoiceEnabled: boolean;
  hdVoiceName: string;
  googleTtsApiKey: string;
}

export interface HdVoiceOption {
  id: string;
  label: string;
}

// Google Cloud TTS Chirp 3: HD 한국어 화자. ko-KR은 이 외에도 30여 종의
// Chirp3-HD 화자(Achernar, Callirrhoe, Despina, Enceladus 등)를 지원한다.
export const hdVoiceOptions: HdVoiceOption[] = [
  { id: 'ko-KR-Chirp3-HD-Kore', label: 'Kore (여성)' },
  { id: 'ko-KR-Chirp3-HD-Aoede', label: 'Aoede (여성)' },
  { id: 'ko-KR-Chirp3-HD-Leda', label: 'Leda (여성)' },
  { id: 'ko-KR-Chirp3-HD-Zephyr', label: 'Zephyr (여성)' },
  { id: 'ko-KR-Chirp3-HD-Charon', label: 'Charon (남성)' },
  { id: 'ko-KR-Chirp3-HD-Fenrir', label: 'Fenrir (남성)' },
  { id: 'ko-KR-Chirp3-HD-Orus', label: 'Orus (남성)' },
  { id: 'ko-KR-Chirp3-HD-Puck', label: 'Puck (남성)' },
];

export const defaultSettings: AppSettings = {
  voiceEnabled: true,
  soundEnabled: true,
  hapticEnabled: true,
  tenSecondCueEnabled: true,
  countdownCueEnabled: true,
  keepAwakeEnabled: true,
  detailedGuideEnabled: true,
  hdVoiceEnabled: true,
  hdVoiceName: 'ko-KR-Chirp3-HD-Kore',
  googleTtsApiKey: '',
};
