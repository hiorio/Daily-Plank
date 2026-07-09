import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { exerciseImages } from '../data/exerciseImages';
import { Exercise } from '../domain/exercise';

interface ExerciseGuideProps {
  exercise: Exercise | null;
  previewExercise?: Exercise | null | undefined;
  title: string;
  isRest: boolean;
  isPrepare?: boolean | undefined;
  detailed: boolean;
}

export function ExerciseGuide({
  exercise,
  previewExercise,
  title,
  isRest,
  isPrepare,
  detailed,
}: ExerciseGuideProps) {
  const displayedExercise = exercise ?? (isPrepare ? previewExercise : null);
  const guides = exercise?.activeGuides ?? [];
  const exerciseImage = displayedExercise ? exerciseImages[displayedExercise.id] : null;
  const shouldShowVisual = Boolean(exerciseImage) || isRest || Boolean(isPrepare);
  const guideText =
    exercise?.startGuide ??
    (isPrepare && previewExercise
      ? `곧 시작할 ${previewExercise.name} 자세를 확인하고 호흡을 고르세요.`
      : '호흡을 고르고 다음 동작을 준비하세요.');

  return (
    <View style={[styles.container, isRest && styles.restContainer]}>
      {shouldShowVisual ? (
        <View style={styles.visualFrame}>
          {exerciseImage && !isRest ? (
            <Image source={exerciseImage} resizeMode="cover" style={styles.exerciseImage} />
          ) : (
            <BreathingVisual />
          )}
        </View>
      ) : null}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.guide}>{guideText}</Text>
      </View>
      {detailed && guides.length > 0 ? (
        <View style={styles.detailPanel}>
          {guides.map((guide) => (
            <Text key={guide} style={styles.detail}>
              {guide}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BreathingVisual() {
  return (
    <View style={styles.breathingVisual}>
      <View style={styles.breathRing}>
        <View style={styles.breathCore} />
      </View>
      <Text style={styles.breathLabel}>호흡 정리</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  restContainer: {
    backgroundColor: colors.accentSoft,
  },
  visualFrame: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.mutedSurface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseImage: {
    width: '100%',
    height: 220,
  },
  breathingVisual: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: '#F3F8FF',
  },
  breathRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: '#B7D1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7FA7DE',
  },
  breathLabel: {
    color: colors.muted,
    fontWeight: '900',
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  guide: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700',
  },
  detailPanel: {
    borderRadius: radius.lg,
    backgroundColor: colors.mutedSurface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  detail: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
