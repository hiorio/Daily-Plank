import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.confirmButton, destructive && styles.destructiveButton]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,41,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  message: {
    color: colors.muted,
    lineHeight: 22,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveButton: {
    backgroundColor: colors.danger,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '900',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
