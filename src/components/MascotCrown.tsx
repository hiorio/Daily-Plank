import { StyleSheet, View } from 'react-native';

// 마스코트 성장 단계: 누적 운동일 7일 미만 1, 21일 미만 2, 그 이상 3.
export type MascotGrowthLevel = 1 | 2 | 3;

export const GROWTH_SCALE: Record<MascotGrowthLevel, number> = {
  1: 0.85,
  2: 1,
  3: 1.14,
};

const GOLD = '#F6C445';
const GOLD_DARK = '#D9A521';
const GEM = '#E5484D';

interface MascotCrownProps {
  left: number;
  top: number;
}

// 3단계 성장 시 머리에 씌우는 작은 왕관.
export function MascotCrown({ left, top }: MascotCrownProps) {
  return (
    <View style={[styles.crown, { left, top }]}>
      <View style={[styles.point, { left: 0 }]} />
      <View style={[styles.point, { left: 6.5 }]} />
      <View style={[styles.point, { left: 13 }]} />
      <View style={styles.base}>
        <View style={styles.gem} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  crown: {
    position: 'absolute',
    width: 21,
    height: 13,
    zIndex: 3,
  },
  point: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: GOLD,
  },
  base: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: 21,
    height: 7,
    backgroundColor: GOLD,
    borderWidth: 1.5,
    borderColor: GOLD_DARK,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gem: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: GEM,
  },
});
