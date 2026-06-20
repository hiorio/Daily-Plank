import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../constants/theme';

interface WorkoutProgressProps {
  progressRate: number;
}

export function WorkoutProgress({ progressRate }: WorkoutProgressProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.max(0, Math.min(100, progressRate))}%`, { duration: 200 }),
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
