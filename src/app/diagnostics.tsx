import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../constants/theme';
import {
  DiagnosticItem,
  DiagnosticsReport,
  runAppDiagnostics,
} from '../services/diagnosticsService';

const statusLabel: Record<DiagnosticItem['status'], string> = {
  PASS: '정상',
  WARN: '확인',
  FAIL: '오류',
};

export default function DiagnosticsScreen() {
  const router = useRouter();
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const nextReport = await runAppDiagnostics();
      setReport(nextReport);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/settings');
      return undefined;
    }

    const timeout = setTimeout(() => {
      void runDiagnostics();
    }, 0);
    return () => clearTimeout(timeout);
  }, [router, runDiagnostics]);

  if (!__DEV__) return null;

  const failedCount = report?.items.filter((item) => item.status === 'FAIL').length ?? 0;
  const warningCount = report?.items.filter((item) => item.status === 'WARN').length ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>앱 점검</Text>
          <Text style={styles.description}>
            TestFlight 또는 실기기 배포 전에 저장소, 세션 데이터, 음성 환경을 빠르게 확인한다.
          </Text>
        </View>

        {report ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>
              {failedCount > 0 ? '조치 필요' : warningCount > 0 ? '확인 필요' : '배포 전 점검 정상'}
            </Text>
            <Text style={styles.summaryText}>
              {report.appName} {report.appVersion} · {report.platform}
            </Text>
            <Text style={styles.summaryText}>Bundle ID: {report.bundleIdentifier}</Text>
            <Text style={styles.summaryText}>
              점검 시각: {new Date(report.generatedAt).toLocaleString()}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="앱 점검 다시 실행"
          onPress={() => void runDiagnostics()}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          <Text style={styles.refreshText}>{loading ? '점검 중' : '다시 점검'}</Text>
        </Pressable>

        <View style={styles.items}>
          {report?.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={[styles.badge, styles[`badge${item.status}`]]}>
                  {statusLabel[item.status]}
                </Text>
              </View>
              <Text style={styles.itemMessage}>{item.message}</Text>
            </View>
          ))}
          {!report && loading ? <Text style={styles.loadingText}>앱 상태를 점검하는 중...</Text> : null}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>실기기에서 꼭 확인할 항목</Text>
          <Text style={styles.noteText}>설정 화면의 음성, 효과음, 진동 테스트</Text>
          <Text style={styles.noteText}>5분 세션 전체 완료와 기록 저장</Text>
          <Text style={styles.noteText}>운동 중 백그라운드 전환 후 시간 보정</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  description: { color: colors.muted, lineHeight: 21 },
  summary: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  summaryText: { color: colors.muted, lineHeight: 20 },
  refreshButton: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: { color: '#FFFFFF', fontWeight: '900' },
  pressed: { opacity: 0.74 },
  items: { gap: spacing.md },
  item: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  itemTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  itemMessage: { color: colors.muted, lineHeight: 20 },
  badge: {
    overflow: 'hidden',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontWeight: '900',
  },
  badgePASS: { color: colors.primaryDark, backgroundColor: colors.surfaceAlt },
  badgeWARN: { color: '#8A5B00', backgroundColor: '#FFF4D6' },
  badgeFAIL: { color: colors.danger, backgroundColor: '#FFE8E8' },
  loadingText: { color: colors.muted, lineHeight: 21 },
  note: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noteTitle: { color: colors.text, fontWeight: '900' },
  noteText: { color: colors.muted, lineHeight: 20 },
});
