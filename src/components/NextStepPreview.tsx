import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

interface NextStepPreviewProps {
  nextStepTitle: string | null;
}

export function NextStepPreview({ nextStepTitle }: NextStepPreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>다음 동작</Text>
      <Text style={styles.title}>{nextStepTitle ?? '세션 완료'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
