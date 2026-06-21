import { Image, StyleSheet, Text, View } from 'react-native';
import { Exercise } from '../domain/exercise';
import { colors, radius, spacing } from '../constants/theme';
import { PostureIllustration } from './PostureIllustration';
import { exerciseImages } from '../data/exerciseImages';

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
  const shouldShowBreathingVisual = isRest || Boolean(isPrepare && !exerciseImage);
  const guideText =
    exercise?.startGuide ??
    (isPrepare && previewExercise
      ? `곧 시작할 ${previewExercise.name} 자세를 확인하고 호흡을 고른다.`
      : '호흡을 고르고 다음 동작을 준비한다.');

  return (
    <View style={[styles.container, isRest && styles.restContainer]}>
      {exerciseImage && !isRest ? (
        <Image source={exerciseImage} resizeMode="cover" style={styles.exerciseImage} />
      ) : (
        <PostureIllustration exerciseId={displayedExercise?.id} isRest={shouldShowBreathingVisual} />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.guide}>{guideText}</Text>
      {detailed &&
        guides.map((guide) => (
          <Text key={guide} style={styles.detail}>
            {guide}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  restContainer: {
    backgroundColor: colors.rest,
  },
  exerciseImage: {
    width: '100%',
    height: 210,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAF7F0',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  guide: {
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  detail: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
