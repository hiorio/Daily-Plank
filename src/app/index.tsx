import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
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

        <View style={styles.statsRow}>
          <StatCard label="연속 운동일" value={`${statistics.streakDays}일`} />
          <StatCard label="이번 주 횟수" value={`${statistics.weeklyWorkoutCount}회`} />
        </View>
        <StatCard label="이번 주 누적 운동 시간" value={formatDurationKorean(statistics.weeklyDurationSeconds)} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>세션 선택</Text>
        </View>
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onPress={() => router.push(`/session/${session.id}`)}
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
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 54,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
});
