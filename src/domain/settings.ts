export interface AppSettings {
  voiceEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  tenSecondCueEnabled: boolean;
  countdownCueEnabled: boolean;
  keepAwakeEnabled: boolean;
  detailedGuideEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  voiceEnabled: true,
  soundEnabled: true,
  hapticEnabled: true,
  tenSecondCueEnabled: true,
  countdownCueEnabled: true,
  keepAwakeEnabled: true,
  detailedGuideEnabled: true,
};
