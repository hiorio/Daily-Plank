import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, defaultSettings, isTtsVoiceId } from '../domain/settings';

const SETTINGS_KEY = 'plank-guide:settings';

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      voiceEnabled: isBoolean(parsed.voiceEnabled) ? parsed.voiceEnabled : defaultSettings.voiceEnabled,
      ttsVoiceId: isTtsVoiceId(parsed.ttsVoiceId) ? parsed.ttsVoiceId : defaultSettings.ttsVoiceId,
      soundEnabled: isBoolean(parsed.soundEnabled) ? parsed.soundEnabled : defaultSettings.soundEnabled,
      hapticEnabled: isBoolean(parsed.hapticEnabled)
        ? parsed.hapticEnabled
        : defaultSettings.hapticEnabled,
      tenSecondCueEnabled: isBoolean(parsed.tenSecondCueEnabled)
        ? parsed.tenSecondCueEnabled
        : defaultSettings.tenSecondCueEnabled,
      countdownCueEnabled: isBoolean(parsed.countdownCueEnabled)
        ? parsed.countdownCueEnabled
        : defaultSettings.countdownCueEnabled,
      keepAwakeEnabled: isBoolean(parsed.keepAwakeEnabled)
        ? parsed.keepAwakeEnabled
        : defaultSettings.keepAwakeEnabled,
      detailedGuideEnabled: isBoolean(parsed.detailedGuideEnabled)
        ? parsed.detailedGuideEnabled
        : defaultSettings.detailedGuideEnabled,
    };
  } catch (error) {
    if (__DEV__) console.warn('Settings are corrupted. Falling back to defaults.', error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
