import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  fetchAnimeCategories,
  fetchCatalog,
  fetchLampaCategories,
  fetchLampaSections,
  type LampaSection,
} from '@/api/catalog';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import {
  ANIME_DEFAULT_REGULAR_SHOWCASE_IDS,
  applyHomeSectionToggles,
  buildSettingsDraft,
  homeSectionLabel,
  materializeLampaSectionDefaults,
  moveInList,
  resolveEnabledHomeSections,
  resolveHomeSectionOrder,
  resolveLampaSectionEndpoints,
  toggleInList,
  toggleLampaSection,
  type HomeSectionId,
} from '@/lib/homeSettingsEditor';
import { type CatalogHomeConfig } from '@/lib/homeSettings';
import { isTvUi } from '@/lib/isTvUi';

type Step = 'sections' | 'feeds';

interface HomeWelcomeModalProps {
  open: boolean;
  config: CatalogHomeConfig;
  onSave: (config: CatalogHomeConfig) => void;
  onSkip: (config: CatalogHomeConfig) => void;
}

export function HomeWelcomeModal({ open, config, onSave, onSkip }: HomeWelcomeModalProps) {
  const [step, setStep] = useState<Step>('sections');
  const [draft, setDraft] = useState(config);
  const draftInitializedRef = useRef(false);

  const { data: contentTypes = [], isFetched: catalogFetched } = useQuery({
    queryKey: ['catalog-root'],
    queryFn: fetchCatalog,
    enabled: open,
  });

  const { data: animeCat, isFetched: animeCatFetched } = useQuery({
    queryKey: ['anime-categories'],
    queryFn: fetchAnimeCategories,
    enabled: open,
  });

  const { data: lampaCat, isFetched: lampaCatFetched } = useQuery({
    queryKey: ['lampa-categories'],
    queryFn: fetchLampaCategories,
    enabled: open,
  });

  const lampaKinds = (lampaCat?.kinds ?? []).filter((k) => k.id === 'movie' || k.id === 'tv');
  const { data: lampaSectionsByKind = {}, isFetched: lampaSectionsFetched } = useQuery({
    queryKey: ['lampa-sections-welcome', lampaKinds.map((k) => k.id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        lampaKinds.map(async (kind) => {
          const sections = await fetchLampaSections(kind.id);
          return [kind.id, sections] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, LampaSection[]>;
    },
    enabled: open && lampaKinds.length > 0,
  });

  const availableTypeIds = useMemo(() => contentTypes.map((t) => t.id), [contentTypes]);
  const showcaseIds = useMemo(
    () => (animeCat?.showcases ?? []).map((showcase) => showcase.id),
    [animeCat?.showcases],
  );
  const lampaSectionEndpointsByKind = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(lampaSectionsByKind).map(([kind, sections]) => [
          kind,
          sections.map((section) => section.endpoint),
        ]),
      ) as Record<string, string[]>,
    [lampaSectionsByKind],
  );

  const catalogReady =
    catalogFetched && availableTypeIds.length > 0 && animeCatFetched && lampaCatFetched;
  const feedsReady = lampaKinds.length === 0 || lampaSectionsFetched;

  useEffect(() => {
    if (!open) {
      draftInitializedRef.current = false;
      setStep('sections');
      return;
    }
    if (draftInitializedRef.current || !catalogReady) return;
    setDraft(
      buildSettingsDraft(config, {
        contentTypeIds: availableTypeIds,
        showcaseIds,
        lampaSectionsByKind: lampaSectionEndpointsByKind,
      }),
    );
    draftInitializedRef.current = true;
  }, [open, config, catalogReady, availableTypeIds, showcaseIds, lampaSectionEndpointsByKind]);

  useEffect(() => {
    if (!open || !draftInitializedRef.current || !feedsReady) return;
    if (!Object.keys(lampaSectionEndpointsByKind).length) return;
    setDraft((prev) => materializeLampaSectionDefaults(prev, lampaSectionEndpointsByKind));
  }, [open, feedsReady, lampaSectionEndpointsByKind]);

  const defaultDraft = useMemo(() => {
    if (!catalogReady) return null;
    const base = buildSettingsDraft(config, {
      contentTypeIds: availableTypeIds,
      showcaseIds,
      lampaSectionsByKind: lampaSectionEndpointsByKind,
    });
    return materializeLampaSectionDefaults(base, lampaSectionEndpointsByKind);
  }, [catalogReady, availableTypeIds, config, showcaseIds, lampaSectionEndpointsByKind]);

  if (!open) return null;

  const kindAvailable = {
    movie: lampaKinds.some((kind) => kind.id === 'movie'),
    tv: lampaKinds.some((kind) => kind.id === 'tv'),
  };
  const enabledSections = resolveEnabledHomeSections(draft).filter((id) => {
    if (id === 'movie') return kindAvailable.movie;
    if (id === 'tv') return kindAvailable.tv;
    return true;
  });
  const sectionsOn = {
    anime: enabledSections.includes('anime'),
    movie: enabledSections.includes('movie'),
    tv: enabledSections.includes('tv'),
  };
  const enabledOrder = resolveHomeSectionOrder(draft, enabledSections);
  const canContinue = sectionsOn.anime || sectionsOn.movie || sectionsOn.tv;

  const setSection = (id: HomeSectionId, enabled: boolean) => {
    const nextSections = {
      anime: id === 'anime' ? enabled : sectionsOn.anime,
      movie: id === 'movie' ? enabled : sectionsOn.movie,
      tv: id === 'tv' ? enabled : sectionsOn.tv,
    };
    if (!nextSections.anime && !nextSections.movie && !nextSections.tv) return;

    const defaultAnimeIds = new Set(ANIME_DEFAULT_REGULAR_SHOWCASE_IDS);
    const defaultAnime =
      showcaseIds.filter((sid) => defaultAnimeIds.has(sid)).length > 0
        ? showcaseIds.filter((sid) => defaultAnimeIds.has(sid))
        : showcaseIds.slice(0, 4);
    const defaultMovie = resolveLampaSectionEndpoints(
      { ...draft, configured: false, enabledLampaSections: {} },
      'movie',
      lampaSectionEndpointsByKind.movie ?? [],
    );
    const defaultTv = resolveLampaSectionEndpoints(
      { ...draft, configured: false, enabledLampaSections: {} },
      'tv',
      lampaSectionEndpointsByKind.tv ?? [],
    );

    setDraft((prev) =>
      applyHomeSectionToggles(prev, nextSections, {
        defaultAnimeShowcases: defaultAnime,
        defaultMovieEndpoints: defaultMovie,
        defaultTvEndpoints: defaultTv,
      }),
    );
  };

  const handleSkip = () => {
    if (!defaultDraft || !feedsReady) return;
    onSkip(defaultDraft);
  };

  const handleSave = () => {
    if (!feedsReady) return;
    const materialized = materializeLampaSectionDefaults(draft, lampaSectionEndpointsByKind);
    onSave({
      ...materialized,
      homeSectionOrder: enabledOrder,
      configured: true,
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleSkip} />
        <View style={styles.sheet}>
          <Text style={styles.stepHint}>
            {step === 'sections' ? 'Шаг 1 из 2' : 'Шаг 2 из 2'}
          </Text>
          <Text style={styles.title}>
            {step === 'sections' ? 'Добро пожаловать' : 'Ленты на главной'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'sections'
              ? 'Выберите разделы и порядок блоков. Настройки можно изменить позже.'
              : 'Отметьте нужные ленты для каждого раздела.'}
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {step === 'sections' ? (
              <>
                {(
                  [
                    ['anime', 'Аниме'],
                    ['movie', 'Фильмы'],
                    ['tv', 'Сериалы'],
                  ] as const
                ).map(([id, label], index) => {
                  if (id !== 'anime' && !kindAvailable[id]) return null;
                  return (
                    <View key={id} style={styles.row}>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Switch
                        value={sectionsOn[id]}
                        onValueChange={(value) => setSection(id, value)}
                        trackColor={{ false: '#3a3948', true: colors.brandAccent }}
                        thumbColor={colors.text}
                      />
                      {isTvUi() ? (
                        <TvFocusable
                          hasTVPreferredFocus={index === 0}
                          onPress={() => setSection(id, !sectionsOn[id])}
                          style={styles.tvToggle}
                        >
                          <Text style={styles.tvToggleLabel}>
                            {sectionsOn[id] ? 'Вкл' : 'Выкл'}
                          </Text>
                        </TvFocusable>
                      ) : null}
                    </View>
                  );
                })}

                {enabledOrder.length > 1 ? (
                  <View style={styles.orderBlock}>
                    <Text style={styles.orderTitle}>Порядок разделов</Text>
                    {enabledOrder.map((id, index) => (
                      <View key={id} style={styles.orderRow}>
                        <Text style={styles.rowLabel}>{homeSectionLabel(id)}</Text>
                        <View style={styles.orderActions}>
                          <TvFocusable
                            disabled={index === 0}
                            onPress={() =>
                              setDraft((prev) => ({
                                ...prev,
                                homeSectionOrder: moveInList(enabledOrder, index, -1),
                              }))
                            }
                            style={styles.orderBtn}
                          >
                            <Text style={styles.orderBtnLabel}>↑</Text>
                          </TvFocusable>
                          <TvFocusable
                            disabled={index === enabledOrder.length - 1}
                            onPress={() =>
                              setDraft((prev) => ({
                                ...prev,
                                homeSectionOrder: moveInList(enabledOrder, index, 1),
                              }))
                            }
                            style={styles.orderBtn}
                          >
                            <Text style={styles.orderBtnLabel}>↓</Text>
                          </TvFocusable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Скрыть азиатский live-action</Text>
                  {isTvUi() ? (
                    <TvFocusable
                      onPress={() =>
                        setDraft((prev) => ({
                          ...prev,
                          hideAsianLiveAction: prev.hideAsianLiveAction === false,
                        }))
                      }
                      style={styles.tvToggle}
                    >
                      <Text style={styles.tvToggleLabel}>
                        {draft.hideAsianLiveAction !== false ? 'Вкл' : 'Выкл'}
                      </Text>
                    </TvFocusable>
                  ) : (
                    <Switch
                      value={draft.hideAsianLiveAction !== false}
                      onValueChange={(checked) =>
                        setDraft((prev) => ({ ...prev, hideAsianLiveAction: checked }))
                      }
                      trackColor={{ false: '#3a3948', true: colors.brandAccent }}
                      thumbColor={colors.text}
                    />
                  )}
                </View>
              </>
            ) : (
              <>
                {sectionsOn.anime ? (
                  <View style={styles.feedBlock}>
                    <Text style={styles.orderTitle}>Аниме</Text>
                    {(animeCat?.showcases ?? []).map((showcase) => (
                      <View key={showcase.id} style={styles.row}>
                        <Text style={styles.rowLabel} numberOfLines={1}>
                          {showcase.name}
                        </Text>
                        <TvFocusable
                          onPress={() =>
                            setDraft((prev) => ({
                              ...prev,
                              enabledAnimeShowcases: toggleInList(
                                prev.enabledAnimeShowcases,
                                showcase.id,
                                !prev.enabledAnimeShowcases.includes(showcase.id),
                                showcaseIds,
                              ),
                            }))
                          }
                          style={styles.tvToggle}
                        >
                          <Text style={styles.tvToggleLabel}>
                            {draft.enabledAnimeShowcases.includes(showcase.id) ? 'Вкл' : 'Выкл'}
                          </Text>
                        </TvFocusable>
                      </View>
                    ))}
                  </View>
                ) : null}

                {(['movie', 'tv'] as const).map((kind) => {
                  if (!sectionsOn[kind]) return null;
                  const sections = lampaSectionsByKind[kind] ?? [];
                  return (
                    <View key={kind} style={styles.feedBlock}>
                      <Text style={styles.orderTitle}>
                        {kind === 'movie' ? 'Фильмы' : 'Сериалы'}
                      </Text>
                      {sections.slice(0, 12).map((section) => {
                        const enabled = (draft.enabledLampaSections[kind] ?? []).includes(
                          section.endpoint,
                        );
                        return (
                          <View key={section.endpoint} style={styles.row}>
                            <Text style={styles.rowLabel} numberOfLines={1}>
                              {section.title}
                            </Text>
                            <TvFocusable
                              onPress={() =>
                                setDraft((prev) =>
                                  toggleLampaSection(
                                    prev,
                                    kind,
                                    section.endpoint,
                                    !enabled,
                                    sections.map((item) => item.endpoint),
                                  ),
                                )
                              }
                              style={styles.tvToggle}
                            >
                              <Text style={styles.tvToggleLabel}>{enabled ? 'Вкл' : 'Выкл'}</Text>
                            </TvFocusable>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TvFocusable onPress={handleSkip} style={styles.secondaryBtn} disabled={!feedsReady}>
              <Text style={styles.secondaryLabel}>Пропустить</Text>
            </TvFocusable>
            {step === 'sections' ? (
              <TvFocusable
                onPress={() => setStep('feeds')}
                style={styles.primaryBtn}
                disabled={!canContinue || !feedsReady}
              >
                <Text style={styles.primaryLabel}>Далее</Text>
              </TvFocusable>
            ) : (
              <>
                <TvFocusable onPress={() => setStep('sections')} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryLabel}>Назад</Text>
                </TvFocusable>
                <TvFocusable
                  onPress={handleSave}
                  style={styles.primaryBtn}
                  disabled={!feedsReady}
                >
                  <Text style={styles.primaryLabel}>Готово</Text>
                </TvFocusable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stepHint: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 15 : 13,
    marginBottom: spacing.sm,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: spacing.sm, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  tvToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tvToggleLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  orderBlock: { marginTop: spacing.md, gap: spacing.xs },
  orderTitle: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 6,
  },
  orderActions: { flexDirection: 'row', gap: spacing.xs },
  orderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orderBtnLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  feedBlock: { gap: spacing.xs, marginBottom: spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  primaryLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: tvFocus.borderColor,
  },
  secondaryLabel: { color: colors.text, fontWeight: '600', fontSize: 15 },
});
