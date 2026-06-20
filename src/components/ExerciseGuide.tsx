import { Image, StyleSheet, Text, View } from 'react-native';
import { Exercise } from '../domain/exercise';
import { colors, radius, spacing } from '../constants/theme';
import { PostureIllustration } from './PostureIllustration';
import { exerciseImages } from '../data/exerciseImages';

interface ExerciseGuideProps {
  exercise: Exercise | null;
  title: string;
  isRest: boolean;
  detailed: boolean;
}

export function ExerciseGuide({ exercise, title, isRest, detailed }: ExerciseGuideProps) {
  const guides = exercise?.activeGuides ?? [];
  const exerciseImage = exercise ? exerciseImages[exercise.id] : null;

  return (
    <View style={[styles.container, isRest && styles.restContainer]}>
      {exerciseImage && !isRest ? (
        <Image source={exerciseImage} resizeMode="cover" style={styles.exerciseImage} />
      ) : (
        <PostureIllustration exerciseId={exercise?.id} isRest={isRest} />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.guide}>{exercise?.startGuide ?? '호흡을 고르고 다음 동작을 준비한다.'}</Text>
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
