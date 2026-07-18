import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { CatSprite } from '../components/CatSprite';
import { ChickSprite } from '../components/ChickSprite';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing } from '../constants/theme';
import { getWorkoutRecordById } from '../database/workoutRecordRepository';
import { WorkoutRecord } from '../domain/workoutRecord';
import { useWorkoutStatistics } from '../hooks/useWorkoutStatistics';
import { useMascotStore } from '../stores/mascotStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatDurationKorean } from '../utils/duration';

export default function CompleteScreen() {
  const router = useRouter();
  const { recordId, sessionId } = useLocalSearchParams<{ recordId?: string; sessionId?: string }>();
  const [record, setRecord] = useState<WorkoutRecord | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const { statistics } = useWorkoutStatistics();
  const mascotType = useSettingsStore((store) => store.settings.mascotType);
  const growthLevel = useMascotStore((store) => store.growthLevel);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (!recordId) return;
    void getWorkoutRecordById(recordId).then(setRecord);
  }, [recordId]);

  const shareDateLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function buildShareMessage(): string {
    const duration = formatDurationKorean(record?.actualDurationSeconds ?? 0);
    const rate = Math.round(record?.completionRate ?? 0);
    const streakPart = statistics.streakDays >= 2 ? ` · 연속 ${statistics.streakDays}일째` : '';
    return `오늘 ${record?.sessionTitle ?? '플랭크'} 완료! ${duration} 운동 · 완료율 ${rate}%${streakPart} 💪 #매일플랭크`;
  }

  async function handleShare() {
    try {
      if (Platform.OS !== 'web') {
        try {
          const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri.startsWith('file://') ? uri : `file://${uri}`);
            return;
          }
        } catch (error) {
          if (__DEV__) console.warn('Share card capture failed', error);
        }
      }
      await Share.share({ message: buildShareMessage() });
    } catch (error) {
      if (__DEV__) console.warn('Share failed', error);
      setShareStatus('이 환경에서는 공유를 지원하지 않습니다.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
          <Text style={styles.title}>세션이 완료됐습니다.</Text>
          <Text style={styles.subtitle}>{record?.sessionTitle ?? '운동 기록을 불러오는 중'}</Text>
        </View>

        <View style={styles.grid}>
          <StatCard label="계획 시간" value={formatDurationKorean(record?.plannedDurationSeconds ?? 0)} />
          <StatCard label="실제 시간" value={formatDurationKorean(record?.actualDurationSeconds ?? 0)} />
        </View>
        <View style={styles.grid}>
          <StatCard label="완료율" value={`${Math.round(record?.completionRate ?? 0)}%`} />
          <StatCard label="건너뛴 동작" value={`${record?.skippedStepCount ?? 0}개`} />
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordEyebrow}>TODAY</Text>
          <View style={styles.recordHeader}>
            <View style={styles.recordText}>
              <Text style={styles.recordTitle}>{record?.sessionTitle ?? '오늘의 운동'}</Text>
              <Text style={styles.recordMeta}>이번 주 누적 {formatDurationKorean(statistics.weeklyDurationSeconds)}</Text>
            </View>
            <Text style={styles.recordRate}>{Math.round(record?.completionRate ?? 0)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, record?.completionRate ?? 0))}%` },
              ]}
            />
          </View>
        </View>

        <View ref={shareCardRef} collapsable={false} style={styles.shareCard}>
          <View style={styles.shareCardHeader}>
            <View style={styles.shareCardText}>
              <Text style={styles.shareCardEyebrow}>매일 플랭크 · {shareDateLabel}</Text>
              <Text style={styles.shareCardTitle}>{record?.sessionTitle ?? '오늘의 플랭크'} 완료!</Text>
            </View>
            {mascotType === 'cat' ? (
              <CatSprite pose="proud" level={growthLevel} />
            ) : mascotType === 'chick' ? (
              <ChickSprite pose="proud" level={growthLevel} />
            ) : null}
          </View>
          <View style={styles.shareCardStats}>
            <View style={styles.shareCardStat}>
              <Text style={styles.shareCardStatValue}>
                {formatDurationKorean(record?.actualDurationSeconds ?? 0)}
              </Text>
              <Text style={styles.shareCardStatLabel}>운동 시간</Text>
            </View>
            <View style={styles.shareCardStat}>
              <Text style={styles.shareCardStatValue}>{Math.round(record?.completionRate ?? 0)}%</Text>
              <Text style={styles.shareCardStatLabel}>완료율</Text>
            </View>
            <View style={styles.shareCardStat}>
              <Text style={styles.shareCardStatValue}>{statistics.streakDays}일</Text>
              <Text style={styles.shareCardStatLabel}>연속 운동</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => void handleShare()} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>성과 카드 공유하기</Text>
          </Pressable>
          {shareStatus ? <Text style={styles.shareStatus}>{shareStatus}</Text> : null}
          <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>홈으로 이동</Text>
          </Pressable>
          {sessionId ? (
            <Pressable onPress={() => router.replace(`/workout/${sessionId}`)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>같은 세션 다시 시작</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 32 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
  grid: { flexDirection: 'row', gap: spacing.md },
  recordCard: {
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
  recordEyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  recordText: { flex: 1, minWidth: 0 },
  recordTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  recordMeta: { color: colors.muted, marginTop: spacing.xs, fontWeight: '700' },
  recordRate: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.mutedSurface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
  shareCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  shareCardText: { flex: 1, minWidth: 0, gap: spacing.xs },
  shareCardEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '900' },
  shareCardTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  shareCardStats: { flexDirection: 'row', gap: spacing.sm },
  shareCardStat: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  shareCardStatValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  shareCardStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800' },
  shareButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  shareStatus: { color: colors.muted, fontWeight: '700', textAlign: 'center' },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  primaryButton: {
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  secondaryButton: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '900' },
});
