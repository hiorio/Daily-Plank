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
      <Pressable accessibilityLabel="이전 동작" onPress={onPrevious} style={styles.iconButton}>
        <Text style={styles.iconText}>이전</Text>
      </Pressable>
      <Pressable accessibilityLabel={paused ? '재개' : '일시정지'} onPress={onTogglePause} style={styles.primaryButton}>
        <Text style={styles.primaryText}>{paused ? '재개' : '일시정지'}</Text>
      </Pressable>
      <Pressable accessibilityLabel="다음 동작" onPress={onNext} style={styles.iconButton}>
        <Text style={styles.iconText}>다음</Text>
      </Pressable>
      <Pressable accessibilityLabel="운동 종료" onPress={onExit} style={styles.exitButton}>
        <Text style={styles.exitText}>종료</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  iconText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  exitButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
