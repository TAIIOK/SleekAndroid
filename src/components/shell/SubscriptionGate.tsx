import { useMemo, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';

import { QrCodeMatrix } from '@/components/auth/QrCodeMatrix';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { BOOSTY_URL } from '@/lib/config';
import { isTvUi } from '@/lib/isTvUi';
import { useAuth } from '@/providers/AuthProvider';

export function Paywall402({ message }: { message?: string | null }) {
  const { clearSubscriptionBlock, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const subscribeUrl = BOOSTY_URL;
  const showQr = isTvUi();

  const qrSize = useMemo(() => (isTvUi() ? 180 : 140), []);

  const openBoosty = () => {
    void Linking.openURL(subscribeUrl);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      clearSubscriptionBlock();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Нужна подписка</Text>
          <Text style={styles.body}>
            {message ?? 'Каталог доступен по подписке Boosty после пробного периода.'}
          </Text>

          {showQr ? (
            <View style={styles.qrBlock}>
              <QrCodeMatrix value={subscribeUrl} size={qrSize} />
              <Text style={styles.qrHint}>Отсканируйте QR на телефоне, чтобы оформить подписку</Text>
            </View>
          ) : null}

          <TvFocusable
            hasTVPreferredFocus
            style={styles.primary}
            focusedStyle={styles.primaryFocused}
            onPress={openBoosty}
          >
            <Text style={styles.primaryText}>Оформить на Boosty</Text>
          </TvFocusable>

          <TvFocusable
            style={styles.secondary}
            focusedStyle={styles.secondaryFocused}
            onPress={() => void onRefresh()}
            disabled={refreshing}
          >
            <Text style={styles.secondaryText}>
              {refreshing ? 'Проверяем…' : 'Уже оплатил — обновить'}
            </Text>
          </TvFocusable>

          <TvFocusable
            style={styles.ghost}
            focusedStyle={styles.ghostFocused}
            onPress={clearSubscriptionBlock}
          >
            <Text style={styles.ghostText}>Закрыть</Text>
          </TvFocusable>
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
    maxWidth: 440,
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
  qrBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  primary: {
    backgroundColor: colors.brandAccent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryFocused: {
    borderWidth: 2,
    borderColor: tvFocus.borderColor,
  },
  primaryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  ghost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostFocused: {
    borderRadius: radii.md,
    backgroundColor: tvFocus.fill,
  },
  ghostText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
