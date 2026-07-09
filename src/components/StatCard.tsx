import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 104,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  icon: {
    minHeight: 20,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
