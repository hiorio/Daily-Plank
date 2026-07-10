export const ttsVoiceIds = [
  'ko-KR-Chirp3-HD-Aoede',
  'ko-KR-Chirp3-HD-Kore',
  'ko-KR-Chirp3-HD-Leda',
  'ko-KR-Chirp3-HD-Callirrhoe',
  'ko-KR-Chirp3-HD-Charon',
  'ko-KR-Chirp3-HD-Puck',
  'ko-KR-Chirp3-HD-Orus',
  'ko-KR-Chirp3-HD-Rasalgethi',
] as const;

export type TtsVoiceId = (typeof ttsVoiceIds)[number];

export const defaultTtsVoiceId: TtsVoiceId = 'ko-KR-Chirp3-HD-Aoede';

export function isTtsVoiceId(value: unknown): value is TtsVoiceId {
  return typeof value === 'string' && ttsVoiceIds.includes(value as TtsVoiceId);
}

export interface AppSettings {
  voiceEnabled: boolean;
  ttsVoiceId: TtsVoiceId;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  tenSecondCueEnabled: boolean;
  countdownCueEnabled: boolean;
  keepAwakeEnabled: boolean;
  detailedGuideEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  voiceEnabled: true,
  ttsVoiceId: defaultTtsVoiceId,
  soundEnabled: true,
  hapticEnabled: true,
  tenSecondCueEnabled: true,
  countdownCueEnabled: true,
  keepAwakeEnabled: true,
  detailedGuideEnabled: true,
};
