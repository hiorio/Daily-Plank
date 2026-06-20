import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/ConfirmModal';
import { colors, radius, spacing } from '../constants/theme';
import { deleteAllWorkoutRecords } from '../database/workoutRecordRepository';
import { AppSettings } from '../domain/settings';
import { useSettingsStore } from '../stores/settingsStore';
import { useStatisticsStore } from '../stores/statisticsStore';

const rows: { key: keyof AppSettings; label: string; description: string }[] = [
  { key: 'voiceEnabled', label: '음성 안내', description: '동작 시작과 주요 큐를 한국어 TTS로 안내한다.' },
  { key: 'soundEnabled', label: '효과음', description: '동작 전환 시 짧은 효과음을 재생한다.' },
  { key: 'hapticEnabled', label: '진동 안내', description: '동작 전환과 카운트다운에 진동을 사용한다.' },
  { key: 'tenSecondCueEnabled', label: '종료 10초 전 안내', description: '각 구간 종료 10초 전에 알려준다.' },
  { key: 'countdownCueEnabled', label: '3초 카운트다운', description: '마지막 3초를 음성으로 센다.' },
  { key: 'keepAwakeEnabled', label: '화면 항상 켜기', description: '운동 중 화면 자동 꺼짐을 방지한다.' },
  { key: 'detailedGuideEnabled', label: '상세 자세 안내', description: '운동 화면에서 자세 안내를 더 많이 표시한다.' },
];

export default function SettingsScreen() {
  const settings = useSettingsStore((store) => store.settings);
  const updateSetting = useSettingsStore((store) => store.updateSetting);
  const refreshStatistics = useStatisticsStore((store) => store.refresh);
  const [deleteVisible, setDeleteVisible] = useState(false);

  async function handleDeleteRecords() {
    await deleteAllWorkoutRecords();
    await refreshStatistics();
    setDeleteVisible(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>설정</Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.description}>{row.description}</Text>
            </View>
            <Switch
              value={settings[row.key]}
              onValueChange={(value) => void updateSetting(row.key, value)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
        <Pressable onPress={() => setDeleteVisible(true)} style={styles.deleteButton}>
          <Text style={styles.deleteText}>운동 기록 전체 삭제</Text>
        </Pressable>
      </ScrollView>
      <ConfirmModal
        visible={deleteVisible}
        title="운동 기록을 모두 삭제할까?"
        message="삭제한 기록은 되돌릴 수 없다."
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
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: spacing.sm },
  row: {
    minHeight: 78,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  rowText: { flex: 1, gap: spacing.xs },
  label: { color: colors.text, fontSize: 16, fontWeight: '900' },
  description: { color: colors.muted, lineHeight: 19 },
  deleteButton: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  deleteText: { color: '#FFFFFF', fontWeight: '900' },
});
