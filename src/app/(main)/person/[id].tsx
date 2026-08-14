import { useCallback, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  findNodeHandle,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchLampaPerson, fetchLampaPersonCredits } from '@/api/lampaPerson';
import { LampaPersonBestWorks } from '@/components/lampa/person/LampaPersonBestWorks';
import { LampaPersonBioCard } from '@/components/lampa/person/LampaPersonBioCard';
import { LampaPersonHero } from '@/components/lampa/person/LampaPersonHero';
import { LampaPersonProjectsList } from '@/components/lampa/person/LampaPersonProjectsList';
import { MobileDetailBackButton } from '@/components/navigation/MobileDetailBackButton';
import { colors, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);
  const scrollRef = useRef<ScrollView>(null);
  const projectsRef = useRef<View>(null);

  const {
    data: person,
    isLoading: personLoading,
    isError: personError,
  } = useQuery({
    queryKey: ['lampa-person', personId],
    queryFn: () => fetchLampaPerson(personId),
    enabled: Number.isFinite(personId) && personId > 0,
  });

  const {
    data: creditsPages,
    isPending: creditsPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['lampa-person-credits', personId],
    queryFn: ({ pageParam }) => fetchLampaPersonCredits(personId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: Number.isFinite(personId) && personId > 0,
  });

  const credits = creditsPages?.pages.flatMap((page) => page.items) ?? [];
  const totalItems = creditsPages?.pages[0]?.totalItems ?? credits.length;

  const scrollToProjects = useCallback(() => {
    const scrollNode = findNodeHandle(scrollRef.current);
    const projectsNode = projectsRef.current;
    if (!scrollNode || !projectsNode) return;
    projectsNode.measureLayout(
      scrollNode,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
      },
      () => {},
    );
  }, []);

  if (!Number.isFinite(personId) || personId <= 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Неверный идентификатор</Text>
      </View>
    );
  }

  if (personLoading && !person) {
    return (
      <View style={styles.root} collapsable={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
        <MobileDetailBackButton />
      </View>
    );
  }

  if (personError || !person) {
    return (
      <View style={styles.root} collapsable={false}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Не удалось загрузить</Text>
          <Text style={styles.muted}>Проверьте подключение или попробуйте позже</Text>
        </View>
        <MobileDetailBackButton />
      </View>
    );
  }

  return (
    <View style={styles.root} collapsable={false}>
      <ScrollView ref={scrollRef} {...chromeScrollProps} style={styles.scroll}>
        <LampaPersonHero person={person} />

        <View style={[styles.body, isTvUi() && styles.bodyTv]}>
          {person.biography ? <LampaPersonBioCard biography={person.biography} /> : null}

          <LampaPersonBestWorks
            items={credits}
            isLoading={creditsPending}
            onViewAll={scrollToProjects}
          />

          <View ref={projectsRef} collapsable={false}>
            <LampaPersonProjectsList
              items={credits}
              isLoading={creditsPending}
              totalItems={totalItems}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={() => void fetchNextPage()}
            />
          </View>
        </View>
      </ScrollView>
      <MobileDetailBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 0,
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  bodyTv: {
    paddingHorizontal: spacing.lg,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.bg,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  muted: { color: colors.textSecondary, textAlign: 'center' },
});
