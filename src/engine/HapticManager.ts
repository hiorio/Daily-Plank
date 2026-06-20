import * as Haptics from 'expo-haptics';

export class HapticManager {
  async notify(enabled: boolean): Promise<void> {
    if (!enabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.warn('Haptic notification failed', error);
    }
  }

  async tick(enabled: boolean): Promise<void> {
    if (!enabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      if (__DEV__) console.warn('Haptic tick failed', error);
    }
  }
}
