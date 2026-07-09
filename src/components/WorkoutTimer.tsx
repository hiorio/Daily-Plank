import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { formatDuration } from '../utils/duration';

interface WorkoutTimerProps {
  seconds: number;
  label: string;
  resting?: boolean;
}

export function WorkoutTimer({ seconds, label, resting = false }: WorkoutTimerProps) {
  const activeColor = resting ? colors.accent : colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.timerRing, { borderColor: activeColor }]}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.time, { color: activeColor }]}>
          {formatDuration(seconds)}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  timerRing: {
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  time: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
