import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppSettings, ReminderHour } from '../domain/settings';

const REMINDER_ID = 'daily-plank-reminder';
const ANDROID_CHANNEL_ID = 'reminder';

// expo-notifications는 웹 로컬 알림 스케줄링을 지원하지 않는다.
export const reminderSupported = Platform.OS !== 'web';

export async function ensureReminderPermission(): Promise<boolean> {
  if (!reminderSupported) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    if (__DEV__) console.warn('Reminder permission check failed', error);
    return false;
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '운동 리마인더',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function scheduleDailyReminder(hour: ReminderHour): Promise<void> {
  if (!reminderSupported) return;
  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: '플랭크 할 시간이에요! 🐥',
      body: '오늘도 코어를 깨워볼까요? 연속 기록을 이어가요.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (!reminderSupported) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);
}

// 앱 시작 시 재동기화. 권한 프롬프트는 띄우지 않고, 이미 허용된 경우에만 다시 예약한다.
export async function syncReminderOnLaunch(settings: AppSettings): Promise<void> {
  if (!reminderSupported || !settings.reminderEnabled) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await scheduleDailyReminder(settings.reminderHour);
  } catch (error) {
    if (__DEV__) console.warn('Reminder launch sync failed', error);
  }
}
