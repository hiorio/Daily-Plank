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
import { ChickPose, CHICK_HEIGHT, CHICK_PLANK_HEIGHT, CHICK_PLANK_WIDTH, CHICK_WIDTH } from './ChickSprite';

// 병아리와 동일한 포즈·크기·애니메이션 엔진을 쓰되 회색 고양이 외형으로 그린 스프라이트.
export type CatPose = ChickPose;

const GREY = '#B4BCC8';
const GREY_DARK = '#8E97A6';
const PAW_GREY = '#A6AFBD';
const CREAM = '#F4F1EA';
const PINK = '#F4A6B0';
const INK = '#20242E';
const BLUSH = '#F7B7A8';
const SWEAT = '#7EB6FF';

interface CatSpriteProps {
  pose: CatPose;
}

export function CatSprite({ pose }: CatSpriteProps) {
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);
  const blink = useSharedValue(1);
  const legSwing = useSharedValue(0);
  const wingWave = useSharedValue(0);
  const sweat = useSharedValue(0);
  const tail = useSharedValue(0);

  useEffect(() => {
    for (const value of [bob, tilt, legSwing, wingWave, sweat, tail]) {
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
    const tailLoop = (duration: number) =>
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
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
      tail.value = tailLoop(900);
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
      tail.value = tailLoop(220);
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
      tail.value = tailLoop(650);
      sweat.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.in(Easing.quad) }), -1, false);
      return;
    }
  }, [blink, bob, legSwing, pose, squash, sweat, tail, tilt, wingWave]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotate: `${tilt.value}deg` }, { scaleY: squash.value }],
  }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const legLeftStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${legSwing.value}deg` }] }));
  const legRightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-legSwing.value}deg` }] }));
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
  const tailStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tail.value * 18}deg` }] }));
  const tailPlankStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tail.value * 22}deg` }] }));

  if (pose === 'plank') {
    return (
      <Animated.View style={[styles.plankWrapper, wrapperStyle]}>
        <Animated.View style={[styles.plankTail, tailPlankStyle]} />
        <View style={styles.plankBody} />
        <View style={[styles.plankEar, styles.plankEarL]} />
        <View style={[styles.plankEar, styles.plankEarR]} />
        <View style={[styles.plankBrow, styles.plankBrowL]} />
        <View style={[styles.plankBrow, styles.plankBrowR]} />
        <View style={[styles.plankEye, styles.plankEyeL]}>
          <View style={styles.eyeHighlight} />
        </View>
        <View style={[styles.plankEye, styles.plankEyeR]}>
          <View style={styles.eyeHighlight} />
        </View>
        <View style={styles.plankNose} />
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
      <Animated.View style={[styles.tail, tailStyle]} />
      <View style={styles.body} />
      <View style={styles.belly} />
      <View style={[styles.ear, styles.earL]}>
        <View style={[styles.earInner, styles.earInnerL]} />
      </View>
      <View style={[styles.ear, styles.earR]}>
        <View style={[styles.earInner, styles.earInnerR]} />
      </View>
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
      <View style={styles.nose} />
      <View style={[styles.whisker, styles.whiskerL1]} />
      <View style={[styles.whisker, styles.whiskerL2]} />
      <View style={[styles.whisker, styles.whiskerR1]} />
      <View style={[styles.whisker, styles.whiskerR2]} />
      <View style={[styles.blush, { left: 12 }]} />
      <View style={[styles.blush, { left: 61 }]} />
      {jump ? (
        <>
          <Animated.View style={[styles.paw, styles.pawJumpL, wingJumpLeftStyle]} />
          <Animated.View style={[styles.paw, styles.pawJumpR, wingWaveStyle]} />
        </>
      ) : greet ? (
        <>
          <View style={[styles.paw, styles.pawL]} />
          <Animated.View style={[styles.paw, styles.pawGreetR, wingWaveStyle]} />
        </>
      ) : (
        <>
          <View style={[styles.paw, styles.pawL, pose === 'run' && styles.pawRunL]} />
          <View style={[styles.paw, styles.pawR, pose === 'run' && styles.pawRunR]} />
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
    top: 12,
    width: 70,
    height: 60,
    backgroundColor: GREY,
    borderWidth: 2,
    borderColor: GREY_DARK,
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  belly: {
    position: 'absolute',
    left: 24,
    top: 40,
    width: 34,
    height: 30,
    backgroundColor: CREAM,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  ear: {
    position: 'absolute',
    top: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: GREY,
  },
  earL: { left: 12, transform: [{ rotate: '-18deg' }] },
  earR: { left: 48, transform: [{ rotate: '18deg' }] },
  earInner: {
    position: 'absolute',
    top: 7,
    left: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: PINK,
  },
  earInnerL: {},
  earInnerR: {},
  eye: {
    position: 'absolute',
    top: 30,
    width: 8,
    height: 10,
    backgroundColor: INK,
    borderRadius: 5,
  },
  eyeHighlight: {
    position: 'absolute',
    top: 1,
    left: 1.5,
    width: 2.6,
    height: 2.6,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  smileEye: {
    position: 'absolute',
    top: 32,
    width: 9,
    height: 6,
    borderBottomWidth: 2.5,
    borderColor: INK,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  nose: {
    position: 'absolute',
    left: 37,
    top: 41,
    width: 8,
    height: 6,
    backgroundColor: PINK,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  whisker: {
    position: 'absolute',
    width: 16,
    height: 1.5,
    backgroundColor: GREY_DARK,
    borderRadius: 1,
    opacity: 0.7,
  },
  whiskerL1: { left: -8, top: 43, transform: [{ rotate: '8deg' }] },
  whiskerL2: { left: -8, top: 48, transform: [{ rotate: '-6deg' }] },
  whiskerR1: { left: 74, top: 43, transform: [{ rotate: '-8deg' }] },
  whiskerR2: { left: 74, top: 48, transform: [{ rotate: '6deg' }] },
  blush: {
    position: 'absolute',
    top: 44,
    width: 9,
    height: 5,
    backgroundColor: BLUSH,
    borderRadius: 4,
    opacity: 0.75,
  },
  tail: {
    position: 'absolute',
    left: 62,
    top: 40,
    width: 12,
    height: 34,
    backgroundColor: GREY,
    borderWidth: 2,
    borderColor: GREY_DARK,
    borderRadius: 6,
    transformOrigin: 'bottom left',
  },
  paw: {
    position: 'absolute',
    top: 44,
    width: 15,
    height: 20,
    backgroundColor: PAW_GREY,
    borderWidth: 2,
    borderColor: GREY_DARK,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  pawL: { left: 1, transform: [{ rotate: '16deg' }] },
  pawR: { left: 66, transform: [{ rotate: '-16deg' }] },
  pawRunL: { transform: [{ rotate: '32deg' }] },
  pawRunR: { transform: [{ rotate: '-4deg' }] },
  pawGreetR: { left: 66, top: 26 },
  pawJumpL: { left: 2, top: 26 },
  pawJumpR: { left: 65, top: 26 },
  leg: {
    position: 'absolute',
    top: 68,
    width: 5,
    height: 12,
    backgroundColor: PAW_GREY,
    borderRadius: 2.5,
  },
  foot: {
    position: 'absolute',
    top: 9,
    left: -3,
    width: 11,
    height: 5,
    backgroundColor: PAW_GREY,
    borderRadius: 2.5,
  },

  plankWrapper: { width: CHICK_PLANK_WIDTH, height: CHICK_PLANK_HEIGHT },
  plankBody: {
    position: 'absolute',
    left: 2,
    top: 14,
    width: 92,
    height: 42,
    backgroundColor: GREY,
    borderWidth: 2,
    borderColor: GREY_DARK,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  plankEar: {
    position: 'absolute',
    top: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: GREY,
  },
  plankEarL: { left: 12, transform: [{ rotate: '-24deg' }] },
  plankEarR: { left: 26, transform: [{ rotate: '-6deg' }] },
  plankBrow: {
    position: 'absolute',
    top: 18,
    width: 9,
    height: 2.5,
    backgroundColor: INK,
    borderRadius: 2,
  },
  plankBrowL: { left: 16, transform: [{ rotate: '14deg' }] },
  plankBrowR: { left: 34, transform: [{ rotate: '-6deg' }] },
  plankEye: {
    position: 'absolute',
    top: 23,
    width: 7,
    height: 7,
    backgroundColor: INK,
    borderRadius: 4,
  },
  plankEyeL: { left: 16 },
  plankEyeR: { left: 34 },
  plankNose: {
    position: 'absolute',
    left: 27,
    top: 30,
    width: 7,
    height: 5,
    backgroundColor: PINK,
    borderRadius: 3,
  },
  plankBlush: {
    position: 'absolute',
    left: 8,
    top: 32,
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
    backgroundColor: PAW_GREY,
    borderWidth: 2,
    borderColor: GREY_DARK,
    borderRadius: 4,
  },
  plankLeg: {
    position: 'absolute',
    top: 50,
    width: 5,
    height: 10,
    backgroundColor: PAW_GREY,
    borderRadius: 2.5,
    transform: [{ rotate: '12deg' }],
  },
  plankTail: {
    position: 'absolute',
    left: 88,
    top: 24,
    width: 10,
    height: 30,
    backgroundColor: GREY,
    borderWidth: 2,
    borderColor: GREY_DARK,
    borderRadius: 5,
    transformOrigin: 'bottom left',
  },
  sweatDrop: {
    position: 'absolute',
    left: 8,
    top: 4,
    width: 7,
    height: 9,
    backgroundColor: SWEAT,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
    borderBottomLeftRadius: 4.5,
    borderBottomRightRadius: 4.5,
  },
});
