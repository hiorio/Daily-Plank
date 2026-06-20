import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { formatDuration } from '../utils/duration';

interface WorkoutTimerProps {
  seconds: number;
  label: string;
}

export function WorkoutTimer({ seconds, label }: WorkoutTimerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.time}>
        {formatDuration(seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
  },
  time: {
    color: colors.text,
    fontSize: 72,
    fontWeight: '900',
  },
});
