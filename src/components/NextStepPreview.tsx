import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

interface NextStepPreviewProps {
  nextStepTitle: string | null;
}

export function NextStepPreview({ nextStepTitle }: NextStepPreviewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.label}>다음 동작</Text>
        <Text numberOfLines={1} style={styles.title}>
          {nextStepTitle ?? '세션 완료'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
