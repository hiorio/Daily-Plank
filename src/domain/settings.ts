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

export const mascotTypes = ['chick', 'cat', 'none'] as const;

export type MascotType = (typeof mascotTypes)[number];

export const defaultMascotType: MascotType = 'chick';

export function isMascotType(value: unknown): value is MascotType {
  return typeof value === 'string' && mascotTypes.includes(value as MascotType);
}

export const reminderHours = [7, 12, 18, 20, 21] as const;

export type ReminderHour = (typeof reminderHours)[number];

export const defaultReminderHour: ReminderHour = 20;

export function isReminderHour(value: unknown): value is ReminderHour {
  return typeof value === 'number' && reminderHours.includes(value as ReminderHour);
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
  mascotType: MascotType;
  reminderEnabled: boolean;
  reminderHour: ReminderHour;
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
  mascotType: defaultMascotType,
  reminderEnabled: false,
  reminderHour: defaultReminderHour,
};
