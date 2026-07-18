import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SessionCard } from '../components/SessionCard';
import { appCopy } from '../constants/copy';
import { colors, radius, spacing } from '../constants/theme';
import { useWorkoutStatistics } from '../hooks/useWorkoutStatistics';
import { useCustomSessionStore } from '../stores/customSessionStore';

export default function HomeScreen() {
  const router = useRouter();
  useCustomSessionStore((store) => store.savedSessions);
  useCustomSessionStore((store) => store.activeByBaseSessionId);
  const getResolvedSessions = useCustomSessionStore((store) => store.getResolvedSessions);
  const sessions = getResolvedSessions();
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="자유 플랭크 도전"
          onPress={() => router.push('/free-plank' as Href)}
          style={({ pressed }) => [styles.freePlankCard, pressed && styles.freePlankCardPressed]}
        >
          <View style={styles.freePlankText}>
            <Text style={styles.freePlankTitle}>자유 플랭크</Text>
            <Text style={styles.freePlankDescription}>
              시간 제한 없이 한계까지! 최고 기록에 도전해 보세요.
            </Text>
          </View>
          <View style={styles.freePlankAction}>
            <Text style={styles.freePlankActionText}>도전</Text>
          </View>
        </Pressable>
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
  freePlankCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  freePlankCardPressed: { opacity: 0.75 },
  freePlankText: { flex: 1, minWidth: 0, gap: spacing.xs },
  freePlankTitle: { color: colors.restText, fontSize: 17, fontWeight: '900' },
  freePlankDescription: { color: colors.muted, lineHeight: 19, fontWeight: '700' },
  freePlankAction: {
    minHeight: 44,
    minWidth: 64,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  freePlankActionText: { color: '#FFFFFF', fontWeight: '900' },
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
