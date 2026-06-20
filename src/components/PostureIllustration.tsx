import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../constants/theme';

type ExercisePoseId =
  | 'knee_plank'
  | 'forearm_plank'
  | 'high_plank'
  | 'side_plank_left'
  | 'side_plank_right'
  | 'shoulder_tap_plank'
  | 'knee_drive_plank'
  | 'up_down_plank'
  | 'plank_jack'
  | 'reverse_plank';

interface PostureIllustrationProps {
  exerciseId?: string | undefined;
  isRest: boolean;
}

interface SegmentProps {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: string;
  color?: string;
}

function isExercisePoseId(exerciseId: string | undefined): exerciseId is ExercisePoseId {
  return (
    exerciseId === 'knee_plank' ||
    exerciseId === 'forearm_plank' ||
    exerciseId === 'high_plank' ||
    exerciseId === 'side_plank_left' ||
    exerciseId === 'side_plank_right' ||
    exerciseId === 'shoulder_tap_plank' ||
    exerciseId === 'knee_drive_plank' ||
    exerciseId === 'up_down_plank' ||
    exerciseId === 'plank_jack' ||
    exerciseId === 'reverse_plank'
  );
}

function Segment({ x, y, w, h, rotate = '0deg', color = colors.primaryDark }: SegmentProps) {
  return (
    <View
      style={[
        styles.segment,
        {
          left: x,
          top: y,
          width: w,
          height: h,
          backgroundColor: color,
          transform: [{ rotate }],
        },
      ]}
    />
  );
}

function Head({ x, y }: { x: number; y: number }) {
  return <View style={[styles.head, { left: x, top: y }]} />;
}

function PlankFigure({ pose }: { pose: ExercisePoseId }) {
  if (pose === 'knee_plank') {
    return (
      <>
        <Head x={42} y={45} />
        <Segment x={62} y={66} w={86} h={13} rotate="8deg" />
        <Segment x={52} y={76} w={13} h={44} rotate="8deg" />
        <Segment x={72} y={79} w={13} h={41} rotate="8deg" />
        <Segment x={138} y={78} w={40} h={12} rotate="34deg" />
        <Segment x={158} y={105} w={44} h={12} rotate="0deg" />
        <Segment x={125} y={86} w={42} h={12} rotate="34deg" />
      </>
    );
  }

  if (pose === 'high_plank') {
    return (
      <>
        <Head x={34} y={44} />
        <Segment x={58} y={64} w={100} h={13} rotate="6deg" />
        <Segment x={52} y={75} w={12} h={58} rotate="-4deg" />
        <Segment x={75} y={76} w={12} h={56} rotate="-4deg" />
        <Segment x={150} y={75} w={60} h={11} rotate="22deg" />
        <Segment x={151} y={84} w={62} h={11} rotate="32deg" />
      </>
    );
  }

  if (pose === 'side_plank_left' || pose === 'side_plank_right') {
    return (
      <View style={pose === 'side_plank_right' ? styles.mirror : undefined}>
        <Head x={42} y={40} />
        <Segment x={64} y={66} w={99} h={14} rotate="-12deg" />
        <Segment x={58} y={82} w={13} h={54} rotate="4deg" />
        <Segment x={150} y={70} w={58} h={11} rotate="10deg" />
        <Segment x={154} y={84} w={52} h={11} rotate="20deg" />
        <Segment x={74} y={49} w={54} h={9} rotate="-40deg" color={colors.accent} />
      </View>
    );
  }

  if (pose === 'shoulder_tap_plank') {
    return (
      <>
        <Head x={36} y={44} />
        <Segment x={59} y={64} w={100} h={13} rotate="5deg" />
        <Segment x={50} y={76} w={12} h={58} rotate="-4deg" />
        <Segment x={76} y={57} w={45} h={10} rotate="-34deg" color={colors.accent} />
        <Segment x={149} y={75} w={62} h={11} rotate="20deg" />
        <Segment x={150} y={87} w={64} h={11} rotate="34deg" />
      </>
    );
  }

  if (pose === 'knee_drive_plank') {
    return (
      <>
        <Head x={35} y={44} />
        <Segment x={58} y={64} w={101} h={13} rotate="5deg" />
        <Segment x={52} y={76} w={12} h={58} rotate="-4deg" />
        <Segment x={75} y={76} w={12} h={56} rotate="-4deg" />
        <Segment x={149} y={74} w={61} h={11} rotate="20deg" />
        <Segment x={134} y={82} w={50} h={12} rotate="112deg" color={colors.accent} />
        <Segment x={123} y={111} w={44} h={11} rotate="10deg" color={colors.accent} />
      </>
    );
  }

  if (pose === 'up_down_plank') {
    return (
      <>
        <Head x={36} y={44} />
        <Segment x={59} y={64} w={101} h={13} rotate="5deg" />
        <Segment x={50} y={86} w={42} h={12} rotate="0deg" />
        <Segment x={82} y={76} w={12} h={56} rotate="-4deg" color={colors.accent} />
        <Segment x={149} y={75} w={62} h={11} rotate="21deg" />
        <Segment x={151} y={86} w={64} h={11} rotate="33deg" />
      </>
    );
  }

  if (pose === 'plank_jack') {
    return (
      <>
        <Head x={34} y={44} />
        <Segment x={58} y={64} w={100} h={13} rotate="6deg" />
        <Segment x={52} y={75} w={12} h={58} rotate="-4deg" />
        <Segment x={75} y={76} w={12} h={56} rotate="-4deg" />
        <Segment x={148} y={73} w={70} h={11} rotate="-1deg" color={colors.accent} />
        <Segment x={148} y={88} w={71} h={11} rotate="45deg" color={colors.accent} />
      </>
    );
  }

  if (pose === 'reverse_plank') {
    return (
      <>
        <Head x={158} y={48} />
        <Segment x={68} y={72} w={100} h={14} rotate="-8deg" />
        <Segment x={52} y={85} w={54} h={12} rotate="-28deg" />
        <Segment x={42} y={105} w={52} h={12} rotate="2deg" />
        <Segment x={150} y={82} w={12} h={54} rotate="-12deg" />
        <Segment x={130} y={83} w={12} h={52} rotate="-10deg" />
      </>
    );
  }

  return (
    <>
      <Head x={35} y={44} />
      <Segment x={58} y={64} w={100} h={13} rotate="6deg" />
      <Segment x={52} y={83} w={48} h={12} rotate="0deg" />
      <Segment x={149} y={78} w={63} h={11} rotate="28deg" />
    </>
  );
}

export function PostureIllustration({ exerciseId, isRest }: PostureIllustrationProps) {
  const pose = isExercisePoseId(exerciseId) ? exerciseId : 'forearm_plank';

  if (isRest) {
    return (
      <View style={[styles.canvas, styles.restCanvas]}>
        <View style={styles.breathCircleOuter}>
          <View style={styles.breathCircleInner} />
        </View>
        <Segment x={42} y={124} w={156} h={10} rotate="0deg" color={colors.restText} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <View style={styles.mat} />
      <PlankFigure pose={pose} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: 240,
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  restCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8FF',
  },
  mat: {
    position: 'absolute',
    left: 28,
    right: 22,
    bottom: 34,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#B7D9C7',
  },
  segment: {
    position: 'absolute',
    borderRadius: 999,
  },
  head: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primaryDark,
  },
  mirror: {
    width: '100%',
    height: '100%',
    transform: [{ scaleX: -1 }],
  },
  breathCircleOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 8,
    borderColor: '#B7D1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCircleInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7FA7DE',
  },
});
