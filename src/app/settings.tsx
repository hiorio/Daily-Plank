import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generatedTtsVoiceOptions } from '../assets/tts/googleTtsAssets';
import { ConfirmModal } from '../components/ConfirmModal';
import { colors, radius, spacing } from '../constants/theme';
import { deleteAllWorkoutRecords } from '../database/workoutRecordRepository';
import { AppSettings, MascotType, ReminderHour, reminderHours, TtsVoiceId } from '../domain/settings';
import { AudioCueManager } from '../engine/AudioCueManager';
import {
  cancelDailyReminder,
  ensureReminderPermission,
  reminderSupported,
  scheduleDailyReminder,
} from '../services/reminderService';
import { useSettingsStore } from '../stores/settingsStore';
import { useStatisticsStore } from '../stores/statisticsStore';

type ToggleSettingKey = Exclude<
  keyof AppSettings,
  'ttsVoiceId' | 'mascotType' | 'reminderEnabled' | 'reminderHour'
>;

const reminderHourLabels: Record<ReminderHour, string> = {
  7: '오전 7시',
  12: '낮 12시',
  18: '오후 6시',
  20: '오후 8시',
  21: '오후 9시',
};

const mascotOptions: { id: MascotType; label: string; emoji: string; description: string }[] = [
  { id: 'chick', label: '병아리', emoji: '🐥', description: '노란 병아리 친구' },
  { id: 'cat', label: '고양이', emoji: '🐱', description: '회색 고양이 친구' },
  { id: 'none', label: '보이지 않기', emoji: '🚫', description: '마스코트 숨기기' },
];

const rows: { key: ToggleSettingKey; label: string; description: string; marker: string }[] = [
  { key: 'voiceEnabled', label: '음성 안내', description: '동작 시작과 주요 알림을 TTS로 안내합니다.', marker: 'V' },
  { key: 'soundEnabled', label: '효과음', description: '동작 전환 및 진행 알림에 효과음을 재생합니다.', marker: 'S' },
  { key: 'hapticEnabled', label: '진동 안내', description: '동작 전환과 카운트다운에 진동을 사용합니다.', marker: 'H' },
  { key: 'tenSecondCueEnabled', label: '종료 10초 전 안내', description: '각 구간 종료 10초 전에 알려줍니다.', marker: '10' },
  { key: 'countdownCueEnabled', label: '5초 카운트다운', description: '마지막 5초를 음성으로 셉니다.', marker: '5' },
  { key: 'keepAwakeEnabled', label: '화면 항상 켜기', description: '운동 중 화면 자동 꺼짐을 방지합니다.', marker: 'A' },
  { key: 'detailedGuideEnabled', label: '상세 자세 안내', description: '운동 화면에서 자세 안내를 더 많이 표시합니다.', marker: 'G' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((store) => store.settings);
  const updateSetting = useSettingsStore((store) => store.updateSetting);
  const refreshStatistics = useStatisticsStore((store) => store.refresh);
  const [cueManager] = useState(() => new AudioCueManager());
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isVoicePreviewPlaying, setVoicePreviewPlaying] = useState(false);

  useEffect(() => {
    return () => cueManager.dispose();
  }, [cueManager]);

  async function handleDeleteRecords() {
    await deleteAllWorkoutRecords();
    await refreshStatistics();
    setDeleteVisible(false);
  }

  async function stopVoicePreview() {
    await cueManager.stopSpeech();
    setVoicePreviewPlaying(false);
  }

  async function handleVoicePreviewPress() {
    if (isVoicePreviewPlaying) {
      await stopVoicePreview();
      setTestStatus('음성 안내 테스트를 정지했습니다.');
      return;
    }

    if (!settings.voiceEnabled) {
      setTestStatus('음성 안내가 꺼져 있습니다.');
      return;
    }

    setVoicePreviewPlaying(true);
    setTestStatus('음성 안내 테스트를 재생 중입니다.');
    try {
      await cueManager.previewVoice(settings);
      setTestStatus('음성 안내 테스트를 완료했습니다.');
    } catch (error) {
      if (__DEV__) console.warn('Voice cue test failed', error);
      setTestStatus('음성 테스트 중 오류가 발생했습니다. 기기 볼륨과 권한을 확인해 주세요.');
    } finally {
      setVoicePreviewPlaying(false);
    }
  }

  async function handleSelectVoice(voiceId: TtsVoiceId) {
    if (isVoicePreviewPlaying) {
      await stopVoicePreview();
      setTestStatus('목소리를 변경해 재생 중이던 테스트 음성을 정지했습니다.');
    }
    await updateSetting('ttsVoiceId', voiceId);
  }

  async function handleToggleReminder(value: boolean) {
    if (!reminderSupported) {
      setTestStatus('웹 버전에서는 알림을 지원하지 않습니다. 앱에서 이용해 주세요.');
      return;
    }
    try {
      if (value) {
        const granted = await ensureReminderPermission();
        if (!granted) {
          setTestStatus('알림 권한이 없어 리마인더를 켤 수 없습니다. 기기 설정에서 허용해 주세요.');
          return;
        }
        await scheduleDailyReminder(settings.reminderHour);
        setTestStatus(`매일 ${reminderHourLabels[settings.reminderHour]}에 알려드릴게요.`);
      } else {
        await cancelDailyReminder();
        setTestStatus('운동 리마인더를 껐습니다.');
      }
      await updateSetting('reminderEnabled', value);
    } catch (error) {
      if (__DEV__) console.warn('Reminder toggle failed', error);
      setTestStatus('리마인더 설정 중 오류가 발생했습니다.');
    }
  }

  async function handleSelectReminderHour(hour: ReminderHour) {
    await updateSetting('reminderHour', hour);
    if (settings.reminderEnabled && reminderSupported) {
      try {
        await scheduleDailyReminder(hour);
        setTestStatus(`매일 ${reminderHourLabels[hour]}에 알려드릴게요.`);
      } catch (error) {
        if (__DEV__) console.warn('Reminder reschedule failed', error);
      }
    }
  }

  async function runCueTest(type: 'sound' | 'haptic') {
    try {
      if (type === 'sound' && !settings.soundEnabled) {
        setTestStatus('효과음이 꺼져 있습니다.');
        return;
      }
      if (type === 'haptic' && !settings.hapticEnabled) {
        setTestStatus('진동 안내가 꺼져 있습니다.');
        return;
      }

      if (type === 'sound') await cueManager.previewSound(settings);
      if (type === 'haptic') await cueManager.previewHaptic(settings);
      setTestStatus('테스트 안내를 실행했습니다.');
    } catch (error) {
      if (__DEV__) console.warn('Cue test failed', error);
      setTestStatus('테스트 실행 중 오류가 발생했습니다. 기기 볼륨과 권한을 확인해 주세요.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>SETTINGS</Text>
            <Text style={styles.title}>환경 설정</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>알림 & 피드백</Text>
          {rows.map((row, index) => (
            <View key={row.key} style={[styles.row, index > 0 && styles.rowBorder]}>
              <View style={styles.marker}>
                <Text style={styles.markerText}>{row.marker}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.description}>{row.description}</Text>
              </View>
              <Switch
                value={settings[row.key]}
                onValueChange={(value) => {
                  if (row.key === 'voiceEnabled' && !value && isVoicePreviewPlaying) {
                    void stopVoicePreview();
                  }
                  void updateSetting(row.key, value);
                }}
                trackColor={{ true: colors.primary, false: '#CBD5E1' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        <View style={styles.voicePanel}>
          <View style={styles.voiceHeader}>
            <Text style={styles.panelTitleInline}>음성 선택</Text>
            <Text style={styles.voiceDescription}>운동 중 안내에 사용할 Google Cloud TTS 음성을 고릅니다.</Text>
          </View>
          <View style={styles.voiceOptions}>
            {generatedTtsVoiceOptions.map((voice) => {
              const selected = settings.ttsVoiceId === voice.id;
              return (
                <Pressable
                  key={voice.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${voice.label} 음성 선택`}
                  onPress={() => void handleSelectVoice(voice.id)}
                  style={({ pressed }) => [
                    styles.voiceOption,
                    selected && styles.voiceOptionSelected,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <View style={styles.voiceOptionText}>
                    <Text style={[styles.voiceLabel, selected && styles.voiceLabelSelected]}>{voice.label}</Text>
                    <Text style={styles.voiceMeta}>{voice.description}</Text>
                  </View>
                  <Text style={[styles.voiceState, selected && styles.voiceStateSelected]}>
                    {selected ? '선택됨' : '선택'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.voicePanel}>
          <View style={styles.voiceHeader}>
            <Text style={styles.panelTitleInline}>마스코트 캐릭터</Text>
            <Text style={styles.voiceDescription}>앱을 돌아다니며 응원하는 캐릭터를 고릅니다.</Text>
          </View>
          <View style={styles.mascotOptions}>
            {mascotOptions.map((mascot) => {
              const selected = settings.mascotType === mascot.id;
              return (
                <Pressable
                  key={mascot.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${mascot.label} 마스코트 선택`}
                  onPress={() => void updateSetting('mascotType', mascot.id)}
                  style={({ pressed }) => [
                    styles.mascotOption,
                    selected && styles.voiceOptionSelected,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.mascotEmoji}>{mascot.emoji}</Text>
                  <Text style={[styles.voiceLabel, selected && styles.voiceLabelSelected]}>{mascot.label}</Text>
                  <Text style={styles.voiceMeta}>{mascot.description}</Text>
                  <Text style={[styles.voiceState, selected && styles.voiceStateSelected]}>
                    {selected ? '선택됨' : '선택'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.voicePanel}>
          <View style={styles.reminderHeaderRow}>
            <View style={[styles.voiceHeader, styles.reminderHeaderText]}>
              <Text style={styles.panelTitleInline}>운동 리마인더</Text>
              <Text style={styles.voiceDescription}>
                {reminderSupported
                  ? '매일 정해진 시간에 플랭크 알림을 보내드립니다.'
                  : '웹 버전에서는 알림을 지원하지 않습니다. 앱에서 이용해 주세요.'}
              </Text>
            </View>
            <Switch
              value={settings.reminderEnabled && reminderSupported}
              disabled={!reminderSupported}
              onValueChange={(value) => void handleToggleReminder(value)}
              trackColor={{ true: colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.reminderHours}>
            {reminderHours.map((hour) => {
              const selected = settings.reminderHour === hour;
              return (
                <Pressable
                  key={hour}
                  accessibilityRole="button"
                  accessibilityLabel={`${reminderHourLabels[hour]} 알림 시간 선택`}
                  disabled={!reminderSupported}
                  onPress={() => void handleSelectReminderHour(hour)}
                  style={({ pressed }) => [
                    styles.reminderHourChip,
                    selected && styles.reminderHourChipSelected,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text
                    style={[styles.reminderHourText, selected && styles.reminderHourTextSelected]}
                  >
                    {reminderHourLabels[hour]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.testPanel}>
          <View style={styles.testHeader}>
            <Text style={styles.testTitle}>안내 테스트</Text>
            <Text style={styles.testDescription}>
              실제 운동 전에 현재 기기에서 음성, 효과음, 진동이 동작하는지 확인합니다.
            </Text>
          </View>
          <View style={styles.testButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isVoicePreviewPlaying ? '음성 안내 테스트 정지' : '음성 안내 테스트 재생'}
              onPress={() => void handleVoicePreviewPress()}
              style={({ pressed }) => [
                styles.testButton,
                isVoicePreviewPlaying && styles.testButtonActive,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={[styles.testButtonIcon, isVoicePreviewPlaying && styles.testButtonActiveText]}>
                {isVoicePreviewPlaying ? '■' : '▶'}
              </Text>
              <Text style={[styles.testButtonText, isVoicePreviewPlaying && styles.testButtonActiveText]}>음성</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="효과음 테스트"
              onPress={() => void runCueTest('sound')}
              style={({ pressed }) => [styles.testButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.testButtonText}>효과음</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="진동 테스트"
              onPress={() => void runCueTest('haptic')}
              style={({ pressed }) => [styles.testButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.testButtonText}>진동</Text>
            </Pressable>
          </View>
          {testStatus ? <Text style={styles.testStatus}>{testStatus}</Text> : null}
        </View>

        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="진단 화면으로 이동"
            onPress={() => router.push('/diagnostics' as Href)}
            style={({ pressed }) => [styles.diagnosticsButton, pressed && styles.pressedButton]}
          >
            <View style={styles.diagnosticsText}>
              <Text style={styles.diagnosticsTitle}>진단 도구</Text>
              <Text style={styles.diagnosticsDescription}>
                배포 전에 세션, 저장소, 음성 환경을 확인합니다.
              </Text>
            </View>
            <Text style={styles.diagnosticsAction}>열기</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => setDeleteVisible(true)} style={styles.deleteButton}>
          <Text style={styles.deleteText}>운동 기록 전체 삭제</Text>
        </Pressable>
      </ScrollView>
      <ConfirmModal
        visible={deleteVisible}
        title="운동 기록을 모두 삭제할까요?"
        message="삭제한 기록은 되돌릴 수 없습니다."
        cancelLabel="취소"
        confirmLabel="전체 삭제"
        destructive
        onCancel={() => setDeleteVisible(false)}
        onConfirm={() => void handleDeleteRecords()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 30 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  panel: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  panelTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  panelTitleInline: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  row: {
    minHeight: 78,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  rowText: { flex: 1, gap: spacing.xs },
  label: { color: colors.text, fontSize: 15, fontWeight: '900' },
  description: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  voicePanel: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  voiceHeader: {
    gap: spacing.xs,
  },
  voiceDescription: {
    color: colors.muted,
    lineHeight: 20,
    fontWeight: '700',
  },
  voiceOptions: {
    gap: spacing.sm,
  },
  mascotOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mascotOption: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  mascotEmoji: {
    fontSize: 30,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reminderHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  reminderHours: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reminderHourChip: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  reminderHourChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  reminderHourText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  reminderHourTextSelected: {
    color: colors.primaryDark,
  },
  voiceOption: {
    minHeight: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  voiceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  voiceOptionText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  voiceLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  voiceLabelSelected: {
    color: colors.primaryDark,
  },
  voiceMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  voiceState: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  voiceStateSelected: {
    color: colors.primaryDark,
  },
  testPanel: {
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  testHeader: { gap: spacing.xs },
  testTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  testDescription: { color: colors.muted, lineHeight: 20, fontWeight: '700' },
  testButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  testButton: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  testButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  testButtonIcon: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  testButtonActiveText: { color: '#FFFFFF' },
  pressedButton: { opacity: 0.72 },
  testButtonText: { color: colors.text, fontWeight: '900' },
  testStatus: { color: colors.primaryDark, fontWeight: '800', lineHeight: 20 },
  diagnosticsButton: {
    minHeight: 82,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  diagnosticsText: { flex: 1, gap: spacing.xs },
  diagnosticsTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  diagnosticsDescription: { color: colors.muted, lineHeight: 20 },
  diagnosticsAction: { color: colors.primary, fontWeight: '900' },
  deleteButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  deleteText: { color: '#FFFFFF', fontWeight: '900' },
});
