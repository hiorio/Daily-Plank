import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SessionCard } from '../components/SessionCard';
import { StatCard } from '../components/StatCard';
import { appCopy } from '../constants/copy';
import { colors, radius, spacing } from '../constants/theme';
import { getWorkoutSessions } from '../data/sessionRepository';
import { useWorkoutStatistics } from '../hooks/useWorkoutStatistics';
import { formatDurationKorean } from '../utils/duration';

export default function HomeScreen() {
  const router = useRouter();
  const sessions = getWorkoutSessions();
  const { statistics } = useWorkoutStatistics();
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{today}</Text>
            <Text style={styles.title}>{appCopy.appTitle}</Text>
            <Text style={styles.subtitle}>
              {statistics.hasWorkedOutToday ? appCopy.todayDone : appCopy.todayNotDone}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="운동 기록" onPress={() => router.push('/history')} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>기록</Text>
            </Pressable>
            <Pressable accessibilityLabel="설정" onPress={() => router.push('/settings')} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>설정</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakIcon}>
            <Text style={styles.streakIconText}>S</Text>
          </View>
          <View style={styles.streakText}>
            <Text style={styles.streakLabel}>연속 운동</Text>
            <Text style={styles.streakValue}>{statistics.streakDays}일 연속</Text>
          </View>
          <View style={styles.streakDots}>
            {Array.from({ length: 7 }).map((_, index) => (
              <View
                key={index}
                style={[styles.streakDot, index < Math.min(statistics.streakDays, 7) && styles.streakDotActive]}
              />
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="이번 주 횟수" value={`${statistics.weeklyWorkoutCount}회`} />
          <StatCard label="이번 주 운동 시간" value={formatDurationKorean(statistics.weeklyDurationSeconds)} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>SESSION</Text>
          <Text style={styles.sectionTitle}>오늘의 플랭크</Text>
        </View>
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onPrepare={() => router.push(`/session/${session.id}`)}
            onStart={() => router.push(`/workout/${session.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    minWidth: 48,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  streakCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  streakIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  streakText: {
    flex: 1,
  },
  streakLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '900',
  },
  streakValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  streakDots: {
    flexDirection: 'row',
    gap: 5,
  },
  streakDot: {
    width: 14,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  streakDotActive: {
    backgroundColor: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
});
