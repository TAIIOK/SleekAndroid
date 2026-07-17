import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
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
  fetchGenres,
  fetchLampaCategories,
  fetchLampaSections,
  type CatalogFilter,
  type LampaSection,
} from '@/api/catalog';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  addAnimeCustomSection,
  animeFilterDisplayName,
  buildAnimeFilterPath,
  buildSettingsDraft,
  removeAnimeCustomSection,
  toggleInList,
  toggleLampaSection,
} from '@/lib/homeSettingsEditor';
import type { CatalogHomeConfig } from '@/lib/homeSettings';

const LAMPA_SECTIONS_PREVIEW = 6;

interface HomeSettingsSheetProps {
  open: boolean;
  config: CatalogHomeConfig;
  onClose: () => void;
  onSave: (config: CatalogHomeConfig) => void;
}

export function HomeSettingsSheet({ open, config, onClose, onSave }: HomeSettingsSheetProps) {
  const [draft, setDraft] = useState(config);
  const [expandedKinds, setExpandedKinds] = useState<Record<string, boolean>>({});
  const [selectedGenreId, setSelectedGenreId] = useState('');
  const [selectedAnimeType, setSelectedAnimeType] = useState('');
  const [selectedAnimeStatus, setSelectedAnimeStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [seasonalYear, setSeasonalYear] = useState(() => new Date().getFullYear());
  const [seasonalSeason, setSeasonalSeason] = useState(1);

  useEffect(() => {
    if (open) setDraft(config);
  }, [open, config]);

  const { data: contentTypes = [] } = useQuery({
    queryKey: ['catalog-root'],
    queryFn: fetchCatalog,
    enabled: open,
  });

  const { data: animeCat } = useQuery({
    queryKey: ['anime-categories'],
    queryFn: fetchAnimeCategories,
    enabled: open,
  });

  const genreFilter = animeCat?.filters?.find((filter) => filter.id === 'genre');
  const { data: genreOptions = [] } = useQuery({
    queryKey: ['anime-genres-dict'],
    queryFn: fetchGenres,
    enabled: open && !!genreFilter?.sourcePath,
  });

  const { data: lampaCat } = useQuery({
    queryKey: ['lampa-categories'],
    queryFn: fetchLampaCategories,
    enabled: open,
  });

  const lampaKinds = (lampaCat?.kinds ?? []).filter(
    (kind) => kind.id === 'movie' || kind.id === 'tv',
  );

  const { data: lampaSectionsByKind = {} } = useQuery({
    queryKey: ['lampa-sections-settings', lampaKinds.map((k) => k.id).join(',')],
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
      ),
    [lampaSectionsByKind],
  );

  const effectiveDraft = useMemo(
    () =>
      buildSettingsDraft(draft, {
        contentTypeIds: contentTypes.map((type) => type.id),
        showcaseIds,
        lampaSectionsByKind: lampaSectionEndpointsByKind,
      }),
    [draft, contentTypes, showcaseIds, lampaSectionEndpointsByKind],
  );

  const contentTypeLabels: Record<string, string> = {
    anime: 'Аниме',
    lampa: 'Фильмы и сериалы',
    manga: 'Манга',
  };

  if (!open) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Настройки главной</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Section title="Типы контента">
              {contentTypes.map((type) => (
                <ToggleRow
                  key={type.id}
                  label={contentTypeLabels[type.id] ?? type.name ?? type.id}
                  value={effectiveDraft.enabledContentTypes.includes(type.id)}
                  onValueChange={(enabled) =>
                    setDraft((prev) => ({
                      ...prev,
                      enabledContentTypes: toggleInList(
                        effectiveDraft.enabledContentTypes,
                        type.id,
                        enabled,
                        contentTypes.map((item) => item.id),
                      ),
                    }))
                  }
                />
              ))}
            </Section>

            {effectiveDraft.enabledContentTypes.includes('anime') ? (
              <Section title="Аниме-витрины">
                {(animeCat?.showcases ?? []).map((showcase) => (
                  <ToggleRow
                    key={showcase.id}
                    label={showcase.name}
                    value={effectiveDraft.enabledAnimeShowcases.includes(showcase.id)}
                    onValueChange={(enabled) =>
                      setDraft((prev) => ({
                        ...prev,
                        enabledAnimeShowcases: toggleInList(
                          effectiveDraft.enabledAnimeShowcases,
                          showcase.id,
                          enabled,
                          showcaseIds,
                        ),
                      }))
                    }
                  />
                ))}
              </Section>
            ) : null}

            {effectiveDraft.enabledContentTypes.includes('lampa')
              ? lampaKinds.map((kind) => {
                  const sections = lampaSectionsByKind[kind.id] ?? [];
                  const expanded = expandedKinds[kind.id];
                  const visible = expanded ? sections : sections.slice(0, LAMPA_SECTIONS_PREVIEW);
                  const enabledEndpoints = effectiveDraft.enabledLampaSections[kind.id] ?? [];

                  return (
                    <Section key={kind.id} title={kind.name}>
                      {visible.map((section) => (
                        <ToggleRow
                          key={section.endpoint}
                          label={section.title}
                          value={enabledEndpoints.includes(section.endpoint)}
                          onValueChange={(enabled) =>
                            setDraft((prev) =>
                              toggleLampaSection(
                                prev,
                                kind.id,
                                section.endpoint,
                                enabled,
                                sections.map((item) => item.endpoint),
                              ),
                            )
                          }
                        />
                      ))}
                      {sections.length > LAMPA_SECTIONS_PREVIEW ? (
                        <Pressable
                          onPress={() =>
                            setExpandedKinds((prev) => ({
                              ...prev,
                              [kind.id]: !prev[kind.id],
                            }))
                          }
                          style={styles.expandBtn}
                        >
                          <Text style={styles.expandText}>
                            {expanded ? 'Свернуть' : `Ещё ${sections.length - LAMPA_SECTIONS_PREVIEW}`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </Section>
                  );
                })
              : null}

            {effectiveDraft.enabledContentTypes.includes('anime') ? (
              <AnimeCustomSectionsGroup
                sections={effectiveDraft.enabledAnimeCustomSections}
                filters={animeCat?.filters ?? []}
                genreOptions={genreOptions.map((genre) => ({
                  id: String(genre.id),
                  name: genre.name,
                }))}
                selectedGenreId={selectedGenreId}
                selectedAnimeType={selectedAnimeType}
                selectedAnimeStatus={selectedAnimeStatus}
                selectedYear={selectedYear}
                seasonalYear={seasonalYear}
                seasonalSeason={seasonalSeason}
                onSelectedGenreIdChange={setSelectedGenreId}
                onSelectedAnimeTypeChange={setSelectedAnimeType}
                onSelectedAnimeStatusChange={setSelectedAnimeStatus}
                onSelectedYearChange={setSelectedYear}
                onSeasonalYearChange={setSeasonalYear}
                onSeasonalSeasonChange={setSeasonalSeason}
                onRemove={(sectionId) =>
                  setDraft((prev) => removeAnimeCustomSection(prev, sectionId))
                }
                onAdd={(title, path) =>
                  setDraft((prev) => addAnimeCustomSection(prev, title, path))
                }
              />
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.saveBtn} onPress={() => onSave({ ...effectiveDraft, configured: true })}>
              <Text style={styles.saveText}>Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (enabled: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel} numberOfLines={2}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.brand }}
        thumbColor={Platform.OS === 'android' ? colors.text : undefined}
      />
    </View>
  );
}

function AnimeCustomSectionsGroup({
  sections,
  filters,
  genreOptions,
  selectedGenreId,
  selectedAnimeType,
  selectedAnimeStatus,
  selectedYear,
  seasonalYear,
  seasonalSeason,
  onSelectedGenreIdChange,
  onSelectedAnimeTypeChange,
  onSelectedAnimeStatusChange,
  onSelectedYearChange,
  onSeasonalYearChange,
  onSeasonalSeasonChange,
  onRemove,
  onAdd,
}: {
  sections: CatalogHomeConfig['enabledAnimeCustomSections'];
  filters: CatalogFilter[];
  genreOptions: Array<{ id: string; name: string }>;
  selectedGenreId: string;
  selectedAnimeType: string;
  selectedAnimeStatus: string;
  selectedYear: number;
  seasonalYear: number;
  seasonalSeason: number;
  onSelectedGenreIdChange: (value: string) => void;
  onSelectedAnimeTypeChange: (value: string) => void;
  onSelectedAnimeStatusChange: (value: string) => void;
  onSelectedYearChange: (value: number) => void;
  onSeasonalYearChange: (value: number) => void;
  onSeasonalSeasonChange: (value: number) => void;
  onRemove: (sectionId: string) => void;
  onAdd: (title: string, path: string) => void;
}) {
  const filterById = (id: string) => filters.find((filter) => filter.id === id);
  const typeValues = filterById('type')?.values ?? [];
  const statusValues = filterById('status')?.values ?? [];

  const addGenre = () => {
    const filter = filterById('genre');
    const genre = genreOptions.find((option) => option.id === selectedGenreId);
    if (!filter || !genre) return;
    const path = buildAnimeFilterPath(filter, genre.id);
    if (!path) return;
    onAdd(`Жанр: ${genre.name}`, path);
    onSelectedGenreIdChange('');
  };

  const addFixed = (filterId: string, value: string) => {
    const filter = filterById(filterId);
    if (!filter || !value) return;
    const path = buildAnimeFilterPath(filter, value);
    if (!path) return;
    onAdd(`${animeFilterDisplayName(filterId)}: ${value}`, path);
    if (filterId === 'type') onSelectedAnimeTypeChange('');
    if (filterId === 'status') onSelectedAnimeStatusChange('');
  };

  const addYear = () => {
    const filter = filterById('year');
    if (!filter) return;
    const path = buildAnimeFilterPath(filter, String(selectedYear));
    if (!path) return;
    onAdd(`Год: ${selectedYear}`, path);
  };

  const addSeasonal = () => {
    const filter = filterById('seasonal');
    if (!filter) return;
    const path = buildAnimeFilterPath(filter, `${seasonalYear}:${seasonalSeason}`);
    if (!path) return;
    const seasonTitle =
      seasonalSeason === 1
        ? 'Зима'
        : seasonalSeason === 2
          ? 'Весна'
          : seasonalSeason === 3
            ? 'Лето'
            : seasonalSeason === 4
              ? 'Осень'
              : 'Сезон';
    onAdd(`${seasonTitle} ${seasonalYear}`, path);
  };

  return (
    <Section title="Разделы по фильтрам">
      {sections.map((section) => (
        <View key={section.id} style={styles.customRow}>
          <View style={styles.customText}>
            <Text style={styles.customTitle}>{section.title}</Text>
            <Text style={styles.customPath} numberOfLines={1}>
              {section.path}
            </Text>
          </View>
          <Pressable onPress={() => onRemove(section.id)} hitSlop={8}>
            <Text style={styles.removeText}>Удалить</Text>
          </Pressable>
        </View>
      ))}

      {genreOptions.length > 0 ? (
        <View style={styles.addBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {genreOptions.map((genre) => (
              <Pressable
                key={genre.id}
                style={[styles.chip, selectedGenreId === genre.id && styles.chipActive]}
                onPress={() => onSelectedGenreIdChange(genre.id)}
              >
                <Text style={[styles.chipLabel, selectedGenreId === genre.id && styles.chipLabelActive]}>
                  {genre.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.addBtn, !selectedGenreId && styles.addBtnDisabled]}
            disabled={!selectedGenreId}
            onPress={addGenre}
          >
            <Text style={styles.addBtnLabel}>Добавить жанр</Text>
          </Pressable>
        </View>
      ) : null}

      {typeValues.length > 0 ? (
        <View style={styles.addBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {typeValues.map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, selectedAnimeType === value && styles.chipActive]}
                onPress={() => onSelectedAnimeTypeChange(value)}
              >
                <Text style={[styles.chipLabel, selectedAnimeType === value && styles.chipLabelActive]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.addBtn, !selectedAnimeType && styles.addBtnDisabled]}
            disabled={!selectedAnimeType}
            onPress={() => addFixed('type', selectedAnimeType)}
          >
            <Text style={styles.addBtnLabel}>Добавить тип</Text>
          </Pressable>
        </View>
      ) : null}

      {statusValues.length > 0 ? (
        <View style={styles.addBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {statusValues.map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, selectedAnimeStatus === value && styles.chipActive]}
                onPress={() => onSelectedAnimeStatusChange(value)}
              >
                <Text style={[styles.chipLabel, selectedAnimeStatus === value && styles.chipLabelActive]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.addBtn, !selectedAnimeStatus && styles.addBtnDisabled]}
            disabled={!selectedAnimeStatus}
            onPress={() => addFixed('status', selectedAnimeStatus)}
          >
            <Text style={styles.addBtnLabel}>Добавить статус</Text>
          </Pressable>
        </View>
      ) : null}

      {filterById('year') ? (
        <View style={styles.addBlock}>
          <View style={styles.yearRow}>
            <Pressable style={styles.yearBtn} onPress={() => onSelectedYearChange(selectedYear - 1)}>
              <Text style={styles.yearBtnLabel}>−</Text>
            </Pressable>
            <Text style={styles.yearValue}>{selectedYear}</Text>
            <Pressable style={styles.yearBtn} onPress={() => onSelectedYearChange(selectedYear + 1)}>
              <Text style={styles.yearBtnLabel}>+</Text>
            </Pressable>
          </View>
          <Pressable style={styles.addBtn} onPress={addYear}>
            <Text style={styles.addBtnLabel}>Добавить год</Text>
          </Pressable>
        </View>
      ) : null}

      {filterById('seasonal') ? (
        <View style={styles.addBlock}>
          <View style={styles.yearRow}>
            <Pressable style={styles.yearBtn} onPress={() => onSeasonalYearChange(seasonalYear - 1)}>
              <Text style={styles.yearBtnLabel}>−</Text>
            </Pressable>
            <Text style={styles.yearValue}>{seasonalYear}</Text>
            <Pressable style={styles.yearBtn} onPress={() => onSeasonalYearChange(seasonalYear + 1)}>
              <Text style={styles.yearBtnLabel}>+</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[
              { id: 1, label: 'Зима' },
              { id: 2, label: 'Весна' },
              { id: 3, label: 'Лето' },
              { id: 4, label: 'Осень' },
            ].map((season) => (
              <Pressable
                key={season.id}
                style={[styles.chip, seasonalSeason === season.id && styles.chipActive]}
                onPress={() => onSeasonalSeasonChange(season.id)}
              >
                <Text style={[styles.chipLabel, seasonalSeason === season.id && styles.chipLabelActive]}>
                  {season.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.addBtn} onPress={addSeasonal}>
            <Text style={styles.addBtnLabel}>Добавить сезон</Text>
          </Pressable>
        </View>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  expandBtn: {
    paddingVertical: spacing.sm,
  },
  expandText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveText: {
    color: colors.brandOn,
    fontSize: 16,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  customText: { flex: 1, gap: 2 },
  customTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  customPath: {
    color: colors.textMuted,
    fontSize: 12,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  addBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.brand,
  },
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnLabel: {
    color: colors.brandOn,
    fontSize: 13,
    fontWeight: '700',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearBtnLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  yearValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
  },
});
