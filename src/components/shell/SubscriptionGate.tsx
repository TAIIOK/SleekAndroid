import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';
import { useAuth } from '@/providers/AuthProvider';

export function Paywall402({ message }: { message?: string | null }) {
  const { clearSubscriptionBlock } = useAuth();

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Нужна подписка</Text>
          <Text style={styles.body}>
            {message ?? 'Каталог доступен по подписке Boosty после пробного периода.'}
          </Text>
          <Pressable
            style={styles.primary}
            onPress={() => void Linking.openURL('https://boosty.to')}
          >
            <Text style={styles.primaryText}>Оформить на Boosty</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={clearSubscriptionBlock}>
            <Text style={styles.ghostText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function SubscriptionGate() {
  const { subscriptionBlocked, subscriptionMessage } = useAuth();
  if (!subscriptionBlocked) return null;
  return <Paywall402 message={subscriptionMessage} />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  primary: {
    backgroundColor: colors.brandAccent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  ghost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});
