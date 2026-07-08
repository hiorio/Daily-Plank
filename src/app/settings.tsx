import { useEffect, useMemo, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/ConfirmModal';
import { colors, radius, spacing } from '../constants/theme';
import { deleteAllWorkoutRecords } from '../database/workoutRecordRepository';
import { AppSettings, hdVoiceOptions } from '../domain/settings';
import { AudioCueManager } from '../engine/AudioCueManager';
import { useSettingsStore } from '../stores/settingsStore';
import { useStatisticsStore } from '../stores/statisticsStore';

type BooleanSettingKey = {
  [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never;
}[keyof AppSettings];

const rows: { key: BooleanSettingKey; label: string; description: string }[] = [
  { key: 'voiceEnabled', label: '음성 안내', description: '동작 시작과 주요 큐를 한국어 TTS로 안내한다.' },
  { key: 'soundEnabled', label: '효과음', description: '동작 전환 시 짧은 효과음을 재생한다.' },
  { key: 'hapticEnabled', label: '진동 안내', description: '동작 전환과 카운트다운에 진동을 사용한다.' },
  { key: 'tenSecondCueEnabled', label: '종료 10초 전 안내', description: '각 구간 종료 10초 전에 알려준다.' },
  { key: 'countdownCueEnabled', label: '3초 카운트다운', description: '마지막 3초를 음성으로 센다.' },
  { key: 'keepAwakeEnabled', label: '화면 항상 켜기', description: '운동 중 화면 자동 꺼짐을 방지한다.' },
  { key: 'detailedGuideEnabled', label: '상세 자세 안내', description: '운동 화면에서 자세 안내를 더 많이 표시한다.' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((store) => store.settings);
  const updateSetting = useSettingsStore((store) => store.updateSetting);
  const refreshStatistics = useStatisticsStore((store) => store.refresh);
  const cueManager = useMemo(() => new AudioCueManager(), []);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cueManager.dispose();
    };
  }, [cueManager]);

  async function handleDeleteRecords() {
    await deleteAllWorkoutRecords();
    await refreshStatistics();
    setDeleteVisible(false);
  }

  async function runCueTest(type: 'voice' | 'sound' | 'haptic' | 'all') {
    const disabledMessages = {
      voice: '음성 안내가 꺼져 있다.',
      sound: '효과음이 꺼져 있다.',
      haptic: '진동 안내가 꺼져 있다.',
      all: '꺼진 항목은 테스트에서 건너뛴다.',
    };

    try {
      if (type === 'voice' && !settings.voiceEnabled) {
        setTestStatus(disabledMessages.voice);
        return;
      }
      if (type === 'sound' && !settings.soundEnabled) {
        setTestStatus(disabledMessages.sound);
        return;
      }
      if (type === 'haptic' && !settings.hapticEnabled) {
        setTestStatus(disabledMessages.haptic);
        return;
      }

      if (type === 'voice') await cueManager.previewVoice(settings);
      if (type === 'sound') await cueManager.previewSound(settings);
      if (type === 'haptic') await cueManager.previewHaptic(settings);
      if (type === 'all') await cueManager.previewAll(settings);

      setTestStatus(type === 'all' ? disabledMessages.all : '테스트 안내를 실행했다.');
    } catch (error) {
      if (__DEV__) console.warn('Cue test failed', error);
      setTestStatus('테스트 실행 중 오류가 발생했다. 기기 음량과 권한을 확인해 달라.');
    }
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
        <View style={styles.testPanel}>
          <View style={styles.testHeader}>
            <View style={styles.hdVoiceHeaderRow}>
              <Text style={styles.testTitle}>Chirp HD 음성</Text>
              <Switch
                value={settings.hdVoiceEnabled}
                onValueChange={(value) => void updateSetting('hdVoiceEnabled', value)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text style={styles.testDescription}>
              Google Cloud TTS의 Chirp 3: HD 모델을 기본 목소리로 사용한다. API 키가 비어 있거나
              네트워크가 불안정하면 기기 내장 음성으로 자동 대체된다.
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Google Cloud TTS API 키"
            value={settings.googleTtsApiKey}
            onChangeText={(value) => void updateSetting('googleTtsApiKey', value)}
            placeholder="Google Cloud TTS API 키"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.apiKeyInput}
          />
          <View style={styles.voiceChips}>
            {hdVoiceOptions.map((option) => {
              const selected = settings.hdVoiceName === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} 음성 선택`}
                  onPress={() => void updateSetting('hdVoiceName', option.id)}
                  style={({ pressed }) => [
                    styles.voiceChip,
                    selected && styles.voiceChipSelected,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={[styles.voiceChipText, selected && styles.voiceChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.testDescription}>
            Chirp 3: HD 한국어 화자는 위 8종 외에도 30여 종이 더 있으며, 목록에 이름만 추가하면
            바로 사용할 수 있다. 아래 음성 테스트로 선택한 목소리를 미리 들을 수 있다.
          </Text>
        </View>
        <View style={styles.testPanel}>
          <View style={styles.testHeader}>
            <Text style={styles.testTitle}>안내 테스트</Text>
            <Text style={styles.testDescription}>
              실제 운동 전에 현재 기기에서 음성, 효과음, 진동이 동작하는지 확인한다.
            </Text>
          </View>
          <View style={styles.testButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="음성 안내 테스트"
              onPress={() => void runCueTest('voice')}
              style={({ pressed }) => [styles.testButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.testButtonText}>음성</Text>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="전체 안내 테스트"
              onPress={() => void runCueTest('all')}
              style={({ pressed }) => [styles.testButtonPrimary, pressed && styles.pressedButton]}
            >
              <Text style={styles.testButtonPrimaryText}>전체</Text>
            </Pressable>
          </View>
          {testStatus ? <Text style={styles.testStatus}>{testStatus}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="앱 점검 화면으로 이동"
          onPress={() => router.push('/diagnostics' as Href)}
          style={({ pressed }) => [styles.diagnosticsButton, pressed && styles.pressedButton]}
        >
          <View style={styles.diagnosticsText}>
            <Text style={styles.diagnosticsTitle}>앱 점검</Text>
            <Text style={styles.diagnosticsDescription}>
              TestFlight 배포 전에 세션, 저장소, 음성 환경을 확인한다.
            </Text>
          </View>
          <Text style={styles.diagnosticsAction}>열기</Text>
        </Pressable>
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
  testPanel: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  testHeader: { gap: spacing.xs },
  testTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  testDescription: { color: colors.muted, lineHeight: 20 },
  hdVoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  apiKeyInput: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  voiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  voiceChip: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  voiceChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  voiceChipText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  voiceChipTextSelected: { color: '#FFFFFF' },
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
    paddingHorizontal: spacing.md,
  },
  testButtonPrimary: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pressedButton: { opacity: 0.72 },
  testButtonText: { color: colors.text, fontWeight: '900' },
  testButtonPrimaryText: { color: '#FFFFFF', fontWeight: '900' },
  testStatus: { color: colors.primaryDark, fontWeight: '700', lineHeight: 20 },
  diagnosticsButton: {
    minHeight: 76,
    borderRadius: radius.md,
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
  diagnosticsAction: { color: colors.primaryDark, fontWeight: '900' },
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
