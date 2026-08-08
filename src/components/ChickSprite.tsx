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

import { GROWTH_SCALE, MascotCrown, MascotGrowthLevel } from './MascotCrown';

// HTML 시안(chick-mascot)과 동일한 도형 구성을 View로 이식한 병아리 스프라이트.
export type ChickPose = 'idle' | 'run' | 'jump' | 'plank' | 'greet' | 'proud' | 'rest';

export const CHICK_WIDTH = 82;
export const CHICK_HEIGHT = 84;
export const CHICK_PLANK_WIDTH = 96;
export const CHICK_PLANK_HEIGHT = 62;
export const CHICK_REST_WIDTH = 104;
export const CHICK_REST_HEIGHT = 82;

const YELLOW = '#FFD54F';
const YELLOW_DARK = '#F5B800';
const WING_YELLOW = '#FFC93A';
const ORANGE = '#FF9838';
const INK = '#20242E';
const BLUSH = '#FFAB91';
const SWEAT = '#7EB6FF';
const TOWEL = '#FFFFFF';
const TOWEL_EDGE = '#DDE3EE';
const BOTTLE = '#7EB6FF';
const BOTTLE_DARK = '#5A97E8';

const TAU = Math.PI * 2;
// 휴식 포즈 한 주기: 수건으로 땀을 닦고(앞쪽) → 물을 한 모금 마신다(뒤쪽).
export function restWipeProgress(t: number): number {
  'worklet';
  if (t < 0.06) return 0;
  if (t < 0.22) {
    const u = (t - 0.06) / 0.16;
    return u * u * (3 - 2 * u);
  }
  if (t < 0.4) return 1;
  if (t < 0.52) {
    const u = (t - 0.4) / 0.12;
    return 1 - u * u * (3 - 2 * u);
  }
  return 0;
}
export function restDrinkProgress(t: number): number {
  'worklet';
  if (t < 0.58) return 0;
  if (t < 0.7) {
    const u = (t - 0.58) / 0.12;
    return u * u * (3 - 2 * u);
  }
  if (t < 0.86) return 1;
  if (t < 0.96) {
    const u = (t - 0.86) / 0.1;
    return 1 - u * u * (3 - 2 * u);
  }
  return 0;
}
// 땀방울: 닦기 전에는 맺혀 있다가 수건이 닿으면 사라지고, 주기 끝에 다시 맺힌다.
export function restSweatOpacity(t: number): number {
  'worklet';
  if (t < 0.26) return 1;
  if (t < 0.36) return 1 - (t - 0.26) / 0.1;
  if (t < 0.92) return 0;
  return (t - 0.92) / 0.08;
}

interface ChickSpriteProps {
  pose: ChickPose;
  level?: MascotGrowthLevel;
}

export function ChickSprite({ pose, level = 1 }: ChickSpriteProps) {
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);
  const blink = useSharedValue(1);
  const legSwing = useSharedValue(0);
  const wingWave = useSharedValue(0);
  const sweat = useSharedValue(0);
  const restCycle = useSharedValue(0);

  useEffect(() => {
    for (const value of [bob, tilt, legSwing, wingWave, sweat, restCycle]) {
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

    if (pose === 'rest') {
      // 하나의 선형 주기로 호흡·물 마시기·수건 흔들림을 함께 구동한다.
      restCycle.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }
  }, [blink, bob, legSwing, pose, restCycle, squash, sweat, tilt, wingWave]);

  const growthScale = GROWTH_SCALE[level];
  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { rotate: `${tilt.value}deg` },
      { scaleY: squash.value },
      { scale: growthScale },
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

  const restWrapperStyle = useAnimatedStyle(() => {
    const t = restCycle.value;
    return {
      transform: [
        { translateY: -3 * Math.sin(TAU * t) },
        { rotate: `${-3 * restDrinkProgress(t)}deg` },
        { scale: growthScale },
      ],
    };
  });
  // 물병 뚜껑이 부리에 닿도록 이동한 뒤 병 밑동만 살짝 들린다.
  const restBottleStyle = useAnimatedStyle(() => {
    const p = restDrinkProgress(restCycle.value);
    return {
      transform: [{ translateX: -40 * p }, { translateY: 10 * p }, { rotate: `${-42 * p}deg` }],
    };
  });
  const restArmStyle = useAnimatedStyle(() => {
    const p = restDrinkProgress(restCycle.value);
    return {
      transform: [{ translateX: -24 * p }, { translateY: 6 * p }, { rotate: `${-16 - 14 * p}deg` }],
    };
  });
  // 수건 든 손: 이마로 올라가 좌우로 톡톡 두드리며 땀을 닦는다.
  const restWipeStyle = useAnimatedStyle(() => {
    const t = restCycle.value;
    const w = restWipeProgress(t);
    const dab = 4 * Math.sin(TAU * 3 * t) * w;
    return {
      // 포즈 전환 시 이전 스프라이트의 opacity가 남는 경우가 있어 매 프레임 명시한다.
      opacity: 1,
      transform: [
        { translateX: 26 * w + dab },
        { translateY: -22 * w },
        { rotate: `${-12 * w}deg` },
      ],
    };
  });
  // 땀방울 3개는 살짝 시차를 두고 닦여 나간다.
  const restSweatStyle1 = useAnimatedStyle(() => ({
    opacity: restSweatOpacity(restCycle.value),
  }));
  const restSweatStyle2 = useAnimatedStyle(() => ({
    opacity: restSweatOpacity((restCycle.value + 0.03) % 1),
  }));
  const restSweatStyle3 = useAnimatedStyle(() => ({
    opacity: restSweatOpacity((restCycle.value + 0.06) % 1),
  }));
  // 마시는 동안에만 눈을 감는다(중간 흐림 없이 또렷하게 전환).
  const restEyeOpenStyle = useAnimatedStyle(() => ({
    opacity: restDrinkProgress(restCycle.value) > 0.5 ? 0 : 1,
  }));
  const restEyeShutStyle = useAnimatedStyle(() => ({
    opacity: restDrinkProgress(restCycle.value) > 0.5 ? 1 : 0,
  }));

  if (pose === 'rest') {
    return (
      <Animated.View style={[styles.restWrapper, restWrapperStyle]}>
        <View style={styles.restBody} />
        <View style={styles.restTuft} />
        <Animated.View style={[styles.restEye, styles.restEyeL, restEyeOpenStyle]}>
          <View style={styles.eyeHighlight} />
        </Animated.View>
        <Animated.View style={[styles.restEye, styles.restEyeR, restEyeOpenStyle]}>
          <View style={styles.eyeHighlight} />
        </Animated.View>
        <Animated.View style={[styles.restEyeShut, styles.restEyeShutL, restEyeShutStyle]} />
        <Animated.View style={[styles.restEyeShut, styles.restEyeShutR, restEyeShutStyle]} />
        <View style={styles.restBeak} />
        <View style={[styles.restBlush, { left: 16 }]} />
        <View style={[styles.restBlush, { left: 62 }]} />
        <Animated.View style={[styles.restSweatDrop, styles.restSweatDrop1, restSweatStyle1]} />
        <Animated.View style={[styles.restSweatDrop, styles.restSweatDrop2, restSweatStyle2]} />
        <Animated.View style={[styles.restSweatDrop, styles.restSweatDrop3, restSweatStyle3]} />
        <Animated.View style={[styles.restWipe, restWipeStyle]}>
          <View style={styles.restWipePaw} />
          <View style={styles.restTowelCloth} />
        </Animated.View>
        <View style={[styles.restLeg, { left: 24 }]} />
        <View style={[styles.restLeg, { left: 46 }]} />
        <Animated.View style={[styles.restArm, restArmStyle]} />
        <Animated.View style={[styles.restBottle, restBottleStyle]}>
          <View style={styles.restBottleBody} />
          <View style={styles.restBottleCap} />
        </Animated.View>
        {level === 3 ? <MascotCrown left={31} top={0} /> : null}
      </Animated.View>
    );
  }

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
        {level === 3 ? <MascotCrown left={14} top={-8} /> : null}
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
      {level === 3 ? <MascotCrown left={31} top={-6} /> : null}
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

  restWrapper: { width: CHICK_REST_WIDTH, height: CHICK_REST_HEIGHT },
  restBody: {
    position: 'absolute',
    left: 10,
    top: 18,
    width: 66,
    height: 54,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  restTuft: {
    position: 'absolute',
    left: 38,
    top: 8,
    width: 10,
    height: 13,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    transform: [{ rotate: '-25deg' }],
  },
  restEye: {
    position: 'absolute',
    top: 35,
    width: 7,
    height: 8,
    backgroundColor: INK,
    borderRadius: 4,
  },
  restEyeL: { left: 23 },
  restEyeR: { left: 55 },
  restEyeShut: {
    position: 'absolute',
    top: 37,
    width: 10,
    height: 6,
    borderBottomWidth: 2.5,
    borderColor: INK,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  restEyeShutL: { left: 21 },
  restEyeShutR: { left: 53 },
  restBeak: {
    position: 'absolute',
    left: 38,
    top: 45,
    width: 11,
    height: 8,
    backgroundColor: ORANGE,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  restBlush: {
    position: 'absolute',
    top: 46,
    width: 9,
    height: 5,
    backgroundColor: BLUSH,
    borderRadius: 4,
    opacity: 0.8,
  },
  restSweatDrop: {
    position: 'absolute',
    backgroundColor: SWEAT,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
    borderBottomLeftRadius: 3.5,
    borderBottomRightRadius: 3.5,
  },
  restSweatDrop1: { left: 42, top: 19, width: 5, height: 6.5 },
  restSweatDrop2: { left: 50, top: 23, width: 4.5, height: 6 },
  restSweatDrop3: { left: 45, top: 28, width: 4, height: 5.5 },
  restWipe: {
    position: 'absolute',
    left: 2,
    top: 44,
    width: 28,
    height: 24,
  },
  restWipePaw: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 14,
    height: 18,
    backgroundColor: WING_YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderRadius: 8,
    transform: [{ rotate: '10deg' }],
  },
  // 수건은 발끝(위쪽 끝)에 걸쳐 쥔 것처럼 손 위로 올려 둔다.
  restTowelCloth: {
    position: 'absolute',
    left: -1,
    top: -8,
    width: 18,
    height: 11,
    backgroundColor: TOWEL,
    borderWidth: 2,
    borderColor: TOWEL_EDGE,
    borderRadius: 5,
  },
  restLeg: {
    position: 'absolute',
    top: 71,
    width: 18,
    height: 7,
    backgroundColor: ORANGE,
    borderRadius: 4,
  },
  restArm: {
    position: 'absolute',
    left: 64,
    top: 48,
    width: 16,
    height: 10,
    backgroundColor: WING_YELLOW,
    borderWidth: 2,
    borderColor: YELLOW_DARK,
    borderRadius: 5,
    transformOrigin: '0% 50%',
  },
  restBottle: {
    position: 'absolute',
    left: 76,
    top: 36,
    width: 16,
    height: 30,
    transformOrigin: '8px 2px',
  },
  restBottleBody: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 16,
    height: 26,
    backgroundColor: BOTTLE,
    borderWidth: 2,
    borderColor: BOTTLE_DARK,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  restBottleCap: {
    position: 'absolute',
    left: 5,
    top: -4,
    width: 6,
    height: 7,
    backgroundColor: BOTTLE_DARK,
    borderRadius: 2,
  },
});
