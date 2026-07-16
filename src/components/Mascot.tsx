import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../constants/theme';
import { useMascotStore } from '../stores/mascotStore';
import { useSettingsStore } from '../stores/settingsStore';
import { CatSprite } from './CatSprite';
import {
  CHICK_HEIGHT,
  CHICK_PLANK_HEIGHT,
  CHICK_PLANK_WIDTH,
  CHICK_WIDTH,
  ChickPose,
  ChickSprite,
} from './ChickSprite';

const BUBBLE_MAX_WIDTH = 220;
// 이동 반경 여백: 상단 헤더, 하단 버튼 영역, 좌우 가장자리를 피한다.
const EDGE_MARGIN_X = 12;
const TOP_MARGIN = 130;
const BOTTOM_MARGIN = 170;

type MascotMode = 'roam' | 'celebrate' | 'plank' | 'proud' | 'hidden';

function modeForPathname(pathname: string): MascotMode {
  if (pathname.startsWith('/workout')) return 'plank';
  if (pathname.startsWith('/session')) return 'hidden';
  if (pathname.startsWith('/complete')) return 'celebrate';
  if (pathname.startsWith('/history')) return 'proud';
  return 'roam';
}

export function Mascot() {
  const pathname = usePathname();
  const mode = modeForPathname(pathname ?? '/');
  const message = useMascotStore((store) => store.message);
  const say = useMascotStore((store) => store.say);
  const mascotType = useSettingsStore((store) => store.settings.mascotType);
  const { width, height } = useWindowDimensions();
  const [isMoving, setIsMoving] = useState(false);

  const x = useSharedValue(EDGE_MARGIN_X + 8);
  const y = useSharedValue(Math.max(TOP_MARGIN, height - BOTTOM_MARGIN - CHICK_HEIGHT));
  const facing = useSharedValue(1);
  const celebratedPathRef = useRef<string | null>(null);

  // 돌아다니기: 무작위 지점을 골라 이동하고 잠깐 쉬기를 반복한다.
  useEffect(() => {
    if (mode !== 'roam' || message) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const minX = EDGE_MARGIN_X;
    const maxX = Math.max(minX + 1, width - CHICK_WIDTH - EDGE_MARGIN_X);
    const minY = TOP_MARGIN;
    const maxY = Math.max(minY + 1, height - BOTTOM_MARGIN - CHICK_HEIGHT);

    const hop = () => {
      if (cancelled) return;
      const targetX = minX + Math.random() * (maxX - minX);
      const targetY = minY + Math.random() * (maxY - minY);
      const distance = Math.hypot(targetX - x.value, targetY - y.value);
      const duration = Math.max(600, Math.round(distance * 4));

      facing.value = targetX >= x.value ? 1 : -1;
      setIsMoving(true);
      x.value = withTiming(targetX, { duration, easing: Easing.inOut(Easing.quad) });
      y.value = withTiming(targetY, { duration, easing: Easing.inOut(Easing.quad) });

      timer = setTimeout(() => {
        if (cancelled) return;
        setIsMoving(false);
        timer = setTimeout(hop, 700 + Math.random() * 1800);
      }, duration);
    };

    hop();
    return () => {
      cancelled = true;
      setIsMoving(false);
      if (timer) clearTimeout(timer);
    };
    // 공유값(x, y, facing)은 안정 참조라 deps에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, message, mode, width]);

  // 고정 위치 모드(축하/플랭크/뿌듯): 정해진 자리로 이동해 자세를 유지한다.
  // 공유값 대입은 reanimated의 정식 API라 immutability 규칙 예외를 둔다.
  useEffect(() => {
    if (mode === 'roam' || mode === 'hidden') return;

    let targetX = width / 2 - CHICK_WIDTH / 2;
    let targetY = Math.max(TOP_MARGIN, height * 0.3);

    if (mode === 'plank') {
      // 운동 화면: 우측 하단 구석에서 함께 플랭크. 중앙 콘텐츠를 가리지 않는다.
      targetX = width - CHICK_PLANK_WIDTH - EDGE_MARGIN_X;
      targetY = Math.max(TOP_MARGIN, height - CHICK_PLANK_HEIGHT - 24);
    } else if (mode === 'proud') {
      // 기록 화면: 우측 하단 구석에서 뿌듯하게 응원.
      targetX = width - CHICK_WIDTH - EDGE_MARGIN_X;
      targetY = Math.max(TOP_MARGIN, height - CHICK_HEIGHT - 36);
    }

    // eslint-disable-next-line react-hooks/immutability
    x.value = withTiming(targetX, { duration: 500, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/immutability
    y.value = withTiming(targetY, { duration: 500, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/immutability
    facing.value = 1;

    if (mode === 'celebrate' && celebratedPathRef.current !== pathname) {
      celebratedPathRef.current = pathname;
      say('와, 오늘 운동 완료! 정말 대단해요!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, mode, pathname, say, width]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: facing.value }],
  }));

  if (mode === 'hidden' || mascotType === 'none') return null;

  const pose: ChickPose =
    mode === 'celebrate'
      ? 'jump'
      : mode === 'plank'
        ? 'plank'
        : mode === 'proud'
          ? 'proud'
          : message
            ? 'greet'
            : isMoving
              ? 'run'
              : 'idle';

  const showBubble = !!message && (mode === 'roam' || mode === 'celebrate');

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Animated.View style={[styles.body, bodyStyle]}>
        {showBubble ? (
          <View style={styles.bubbleWrap}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{message}</Text>
            </View>
            <View style={styles.bubbleTail} />
          </View>
        ) : null}
        <Animated.View style={faceStyle}>
          {mascotType === 'cat' ? <CatSprite pose={pose} /> : <ChickSprite pose={pose} />}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    pointerEvents: 'none',
  },
  body: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
  },
  bubbleWrap: {
    position: 'absolute',
    bottom: CHICK_HEIGHT + 4,
    alignItems: 'center',
    width: BUBBLE_MAX_WIDTH,
    left: -(BUBBLE_MAX_WIDTH - CHICK_WIDTH) / 2,
  },
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  bubbleTail: {
    width: 12,
    height: 12,
    marginTop: -6,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
