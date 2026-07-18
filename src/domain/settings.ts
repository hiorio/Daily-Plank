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

export const reminderHourOptions = [6, 7, 8, 12, 15, 18, 20, 21, 22] as const;

export type ReminderHour = (typeof reminderHourOptions)[number];

export const defaultReminderHours: ReminderHour[] = [20];

export function isReminderHour(value: unknown): value is ReminderHour {
  return typeof value === 'number' && reminderHourOptions.includes(value as ReminderHour);
}

export function sanitizeReminderHours(value: unknown): ReminderHour[] {
  if (!Array.isArray(value)) return [...defaultReminderHours];
  const valid = value.filter(isReminderHour);
  return [...new Set(valid)].sort((left, right) => left - right);
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
  reminderHours: ReminderHour[];
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
  reminderHours: [...defaultReminderHours],
};
