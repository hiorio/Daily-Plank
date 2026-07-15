import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// HTML 시안(chick-mascot)과 동일한 도형 구성을 View로 이식한 병아리 스프라이트.
export type ChickPose = 'idle' | 'run' | 'jump' | 'plank' | 'greet' | 'proud';

export const CHICK_WIDTH = 82;
export const CHICK_HEIGHT = 84;
export const CHICK_PLANK_WIDTH = 96;
export const CHICK_PLANK_HEIGHT = 62;

const YELLOW = '#FFD54F';
const YELLOW_DARK = '#F5B800';
const WING_YELLOW = '#FFC93A';
const ORANGE = '#FF9838';
const INK = '#20242E';
const BLUSH = '#FFAB91';
const SWEAT = '#7EB6FF';

interface ChickSpriteProps {
  pose: ChickPose;
}

export function ChickSprite({ pose }: ChickSpriteProps) {
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);
  const blink = useSharedValue(1);
  const legSwing = useSharedValue(0);
  const wingWave = useSharedValue(0);
  const sweat = useSharedValue(0);

  useEffect(() => {
    for (const value of [bob, tilt, legSwing, wingWave, sweat]) {
      cancelAnimation(value);
      value.value = 0;
    }
    cancelAnimation(squash);
    squash.value = 1;
    cancelAnimation(blink);
    blink.value = 1;

    const blinkLoop = () =>
      withRepeat(
        withSequence(
          withDelay(3100, withTiming(0.12, { duration: 70 })),
          withTiming(1, { duration: 90 }),
        ),
        -1,
        false,
      );

    if (pose === 'idle' || pose === 'greet' || pose === 'proud') {
      bob.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      if (pose !== 'proud') blink.value = blinkLoop();
      if (pose === 'proud') {
        squash.value = withRepeat(
          withSequence(
            withTiming(1.035, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
      }
      if (pose === 'greet') {
        wingWave.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
      }
      return;
    }

    if (pose === 'run') {
      tilt.value = 6;
      bob.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 190, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
      legSwing.value = withRepeat(
        withSequence(
          withTiming(38, { duration: 190, easing: Easing.inOut(Easing.quad) }),
          withTiming(-38, { duration: 190, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
      return;
    }

    if (pose === 'jump') {
      bob.value = withRepeat(
        withSequence(
          withTiming(-26, { duration: 380, easing: Easing.out(Easing.quad) }),
          withTiming(-26, { duration: 220 }),
          withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 120 }),
        ),
        -1,
        false,
      );
      squash.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 380 }),
          withTiming(1.05, { duration: 220 }),
          withTiming(0.94, { duration: 380 }),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wingWave.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 550, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }

    if (pose === 'plank') {
      tilt.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      sweat.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.in(Easing.quad) }), -1, false);
      return;
    }
  }, [blink, bob, legSwing, pose, squash, sweat, tilt, wingWave]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { rotate: `${tilt.value}deg` },
      { scaleY: squash.value },
    ],
  }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const legLeftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${legSwing.value}deg` }],
  }));
  const legRightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-legSwing.value}deg` }],
  }));
  const wingWaveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-150 + wingWave.value * 50}deg` }],
  }));
  const wingJumpLeftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${150 - wingWave.value * 30}deg` }],
  }));
  const sweatStyle = useAnimatedStyle(() => ({
    opacity: sweat.value < 0.25 ? sweat.value * 4 : 1 - sweat.value,
    transform: [{ translateY: sweat.value * 16 }, { scale: 0.6 + sweat.value * 0.4 }],
  }));

  if (pose === 'plank') {
    return (
      <Animated.View style={[styles.plankWrapper, wrapperStyle]}>
        <View style={styles.plankBody} />
        <View style={styles.plankTuft} />
        <View style={[styles.plankBrow, styles.plankBrowL]} />
        <View style={[styles.plankBrow, styles.plankBrowR]} />
        <View style={[styles.plankEye, styles.plankEyeL]}>
          <View style={styles.eyeHighlight} />
        </View>
        <View style={[styles.plankEye, styles.plankEyeR]}>
          <View style={styles.eyeHighlight} />
        </View>
        <View style={styles.plankBeak} />
        <View style={styles.plankBlush} />
        <View style={[styles.plankForearm, { left: 20 }]} />
        <View style={[styles.plankForearm, { left: 34 }]} />
        <View style={[styles.plankLeg, { left: 78 }]} />
        <View style={[styles.plankLeg, { left: 68 }]} />
        <Animated.View style={[styles.sweatDrop, sweatStyle]} />
      </Animated.View>
    );
  }

  const proud = pose === 'proud';
  const jump = pose === 'jump';
  const greet = pose === 'greet';

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle]}>
      <View style={styles.body} />
      <View style={styles.tuft} />
      {proud ? (
        <>
          <View style={[styles.smileEye, { left: 22 }]} />
          <View style={[styles.smileEye, { left: 46 }]} />
        </>
      ) : (
        <>
          <Animated.View style={[styles.eye, { left: 24 }, eyeStyle]}>
            <View style={styles.eyeHighlight} />
          </Animated.View>
          <Animated.View style={[styles.eye, { left: 48 }, eyeStyle]}>
            <View style={styles.eyeHighlight} />
          </Animated.View>
        </>
      )}
      <View style={styles.beak} />
      <View style={[styles.blush, { left: 16 }]} />
      <View style={[styles.blush, { left: 57 }]} />
      {jump ? (
        <>
          <Animated.View style={[styles.wing, styles.wingJumpL, wingJumpLeftStyle]} />
          <Animated.View style={[styles.wing, styles.wingJumpR, wingWaveStyle]} />
        </>
      ) : greet ? (
        <>
          <View style={[styles.wing, styles.wingL]} />
          <Animated.View style={[styles.wing, styles.wingGreetR, wingWaveStyle]} />
        </>
      ) : (
        <>
          <View style={[styles.wing, styles.wingL, pose === 'run' && styles.wingRunL]} />
          <View style={[styles.wing, styles.wingR, pose === 'run' && styles.wingRunR]} />
        </>
      )}
      <Animated.View style={[styles.leg, { left: 30 }, legLeftStyle]}>
        <View style={styles.foot} />
      </Animated.View>
      <Animated.View style={[styles.leg, { left: 48 }, legRightStyle]}>
        <View style={styles.foot} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: CHICK_WIDTH, height: CHICK_HEIGHT },
  body: {
    position: 'absolute',
    left: 6,
    top: 10,
    width: 70,
    height: 62,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  tuft: {
    position: 'absolute',
    left: 36,
    top: 3,
    width: 10,
    height: 12,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    transform: [{ rotate: '-25deg' }],
  },
  eye: {
    position: 'absolute',
    top: 28,
    width: 7,
    height: 9,
    backgroundColor: INK,
    borderRadius: 4.5,
  },
  eyeHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 2.5,
    height: 2.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  smileEye: {
    position: 'absolute',
    top: 30,
    width: 9,
    height: 6,
    borderBottomWidth: 2.5,
    borderColor: INK,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  beak: {
    position: 'absolute',
    left: 35,
    top: 36,
    width: 12,
    height: 8,
    backgroundColor: ORANGE,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  blush: {
    position: 'absolute',
    top: 39,
    width: 9,
    height: 5,
    backgroundColor: BLUSH,
    borderRadius: 4,
    opacity: 0.8,
  },
  wing: {
    position: 'absolute',
    top: 40,
    width: 16,
    height: 22,
    backgroundColor: WING_YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  wingL: { left: 0, transform: [{ rotate: '18deg' }] },
  wingR: { left: 66, transform: [{ rotate: '-18deg' }] },
  wingRunL: { transform: [{ rotate: '34deg' }] },
  wingRunR: { transform: [{ rotate: '-6deg' }] },
  wingGreetR: { left: 66, top: 24 },
  wingJumpL: { left: 0, top: 26 },
  wingJumpR: { left: 66, top: 26 },
  leg: {
    position: 'absolute',
    top: 70,
    width: 4,
    height: 10,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  foot: {
    position: 'absolute',
    top: 8,
    left: -3,
    width: 10,
    height: 4,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },

  plankWrapper: { width: CHICK_PLANK_WIDTH, height: CHICK_PLANK_HEIGHT },
  plankBody: {
    position: 'absolute',
    left: 2,
    top: 12,
    width: 92,
    height: 44,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  plankTuft: {
    position: 'absolute',
    left: 18,
    top: 5,
    width: 10,
    height: 12,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    transform: [{ rotate: '-25deg' }],
  },
  plankBrow: {
    position: 'absolute',
    top: 17,
    width: 9,
    height: 2.5,
    backgroundColor: INK,
    borderRadius: 2,
  },
  plankBrowL: { left: 16, transform: [{ rotate: '14deg' }] },
  plankBrowR: { left: 34, transform: [{ rotate: '-6deg' }] },
  plankEye: {
    position: 'absolute',
    top: 22,
    width: 7,
    height: 7,
    backgroundColor: INK,
    borderRadius: 4,
  },
  plankEyeL: { left: 16 },
  plankEyeR: { left: 34 },
  plankBeak: {
    position: 'absolute',
    left: 27,
    top: 28,
    width: 10,
    height: 7,
    backgroundColor: ORANGE,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  plankBlush: {
    position: 'absolute',
    left: 8,
    top: 31,
    width: 9,
    height: 5,
    backgroundColor: BLUSH,
    borderRadius: 4,
    opacity: 0.8,
  },
  plankForearm: {
    position: 'absolute',
    top: 48,
    width: 9,
    height: 14,
    backgroundColor: WING_YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderRadius: 4,
  },
  plankLeg: {
    position: 'absolute',
    top: 50,
    width: 4,
    height: 10,
    backgroundColor: ORANGE,
    borderRadius: 2,
    transform: [{ rotate: '12deg' }],
  },
  sweatDrop: {
    position: 'absolute',
    left: 8,
    top: 2,
    width: 7,
    height: 9,
    backgroundColor: SWEAT,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
    borderBottomLeftRadius: 4.5,
    borderBottomRightRadius: 4.5,
  },
});
