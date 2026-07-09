import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius, spacing } from '../constants/theme';

interface WorkoutProgressProps {
  progressRate: number;
  resting?: boolean;
}

export function WorkoutProgress({ progressRate, resting = false }: WorkoutProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progressRate));
  const fillColor = resting ? colors.accent : colors.primary;
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${clampedProgress}%`, { duration: 200 }),
    backgroundColor: fillColor,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedStyle]} />
      </View>
      <Text style={[styles.percent, { color: fillColor }]}>{Math.round(clampedProgress)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  percent: {
    width: 42,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
  },
});
