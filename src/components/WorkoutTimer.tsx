import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing } from '../constants/theme';
import { formatDuration } from '../utils/duration';

const RING_SIZE = 214;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface WorkoutTimerProps {
  seconds: number;
  totalSeconds?: number | undefined;
  label: string;
  resting?: boolean;
}

export function WorkoutTimer({ seconds, totalSeconds, label, resting = false }: WorkoutTimerProps) {
  const activeColor = resting ? colors.accent : colors.primary;
  const trackColor = resting ? colors.accentSoft : colors.primarySoft;
  const fraction =
    totalSeconds && totalSeconds > 0 ? Math.max(0, Math.min(1, seconds / totalSeconds)) : 1;
  const progress = useSharedValue(fraction);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    progress.value = withTiming(fraction, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.timerRing}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={trackColor}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={activeColor}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            animatedProps={ringProps}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
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
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
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
