import { StyleSheet, Text, View } from 'react-native';
import { Exercise } from '../domain/exercise';
import { colors, radius, spacing } from '../constants/theme';
import { PostureIllustration } from './PostureIllustration';

interface ExerciseGuideProps {
  exercise: Exercise | null;
  title: string;
  isRest: boolean;
  detailed: boolean;
}

export function ExerciseGuide({ exercise, title, isRest, detailed }: ExerciseGuideProps) {
  const guides = exercise?.activeGuides ?? [];

  return (
    <View style={[styles.container, isRest && styles.restContainer]}>
      <PostureIllustration exerciseId={exercise?.id} isRest={isRest} />
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
