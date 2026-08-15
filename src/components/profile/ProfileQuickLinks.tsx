import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileSection } from '@/components/profile/ProfileSection';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

const LINKS = [
  {
    to: '/history',
    title: 'История',
    subtitle: 'Недавно просмотренное',
    icon: '🕐',
  },
  {
    to: '/library/lists',
    title: 'Медиатека',
    subtitle: 'Аниме, фильмы и сериалы',
    icon: '📚',
  },
  {
    to: '/friends/feed',
    title: 'Друзья',
    subtitle: 'Лента, список и заявки',
    icon: '👥',
  },
  {
    to: '/downloads',
    title: 'Загрузки',
    subtitle: 'Офлайн-контент',
    icon: '⬇️',
    phoneOnly: true,
  },
] as const;

export function ProfileQuickLinks() {
  const router = useRouter();
  const tv = isTvUi();
  const links = LINKS.filter((link) => !(tv && 'phoneOnly' in link && link.phoneOnly));

  return (
    <ProfileSection title="Быстрые ссылки">
      <View style={styles.grid}>
        {links.map((link) => {
          const content = (
            <>
              <Text style={styles.icon}>{link.icon}</Text>
              <View style={styles.text}>
                <Text style={styles.title}>{link.title}</Text>
                <Text style={styles.subtitle}>{link.subtitle}</Text>
              </View>
            </>
          );
          if (tv) {
            return (
              <TvFocusable
                key={link.to}
                style={styles.card}
                onPress={() => router.push(link.to as '/')}
              >
                {content}
              </TvFocusable>
            );
          }
          return (
            <Pressable
              key={link.to}
              style={styles.card}
              onPress={() => router.push(link.to as '/')}
            >
              {content}
            </Pressable>
          );
        })}
      </View>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
  },
  icon: {
    fontSize: 22,
    width: 40,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
