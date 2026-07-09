import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

interface WorkoutControlsProps {
  paused: boolean;
  onPrevious: () => void;
  onTogglePause: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function WorkoutControls({
  paused,
  onPrevious,
  onTogglePause,
  onNext,
  onExit,
}: WorkoutControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.secondaryRow}>
        <Pressable accessibilityLabel="이전 동작" onPress={onPrevious} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>이전</Text>
        </Pressable>
        <Pressable accessibilityLabel="다음 동작" onPress={onNext} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>건너뛰기</Text>
        </Pressable>
      </View>
      <View style={styles.primaryRow}>
        <Pressable accessibilityLabel={paused ? '재개' : '일시정지'} onPress={onTogglePause} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{paused ? '계속하기' : '일시정지'}</Text>
        </Pressable>
        <Pressable accessibilityLabel="운동 종료" onPress={onExit} style={styles.exitButton}>
          <Text style={styles.exitText}>종료</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    minHeight: 56,
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
  exitButton: {
    width: 72,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
