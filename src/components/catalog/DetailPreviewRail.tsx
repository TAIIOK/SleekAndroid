import { View } from 'react-native';

import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { layout } from '@/constants/aniverse';
import { capDetailRailItems } from '@/lib/catalogRailPage';
import { useDetailFocusPath, useDetailFocusSlot } from '@/lib/detailFocus';

interface DetailPreviewRailProps {
  title: string;
  items: RailItem[];
  loading?: boolean;
  onItemPress: (item: RailItem) => void;
  onSeeAll?: () => void;
  /** Vertical D-pad slot for this row. The poster rail sits one step below «Смотреть все». */
  focusPriority?: number;
}

/** One catalog page on the detail screen, with a separate screen for the rest. */
export function DetailPreviewRail({
  title,
  items,
  loading = false,
  onItemPress,
  onSeeAll,
  focusPriority,
}: DetailPreviewRailProps) {
  const page = capDetailRailItems(items);
  const hasMore = onSeeAll != null && items.length > page.length;
  const focusPath = useDetailFocusPath();
  const seeAllFocus = useDetailFocusSlot(hasMore ? focusPriority : undefined);
  const railPriority =
    focusPriority != null ? (hasMore ? focusPriority + 1 : focusPriority) : undefined;

  if (!loading && page.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title={title}
        flush
        onSeeAll={hasMore ? onSeeAll : undefined}
        seeAllHostRef={hasMore ? seeAllFocus.hostRef : undefined}
        seeAllNextFocusUp={hasMore ? seeAllFocus.nextFocusUp : undefined}
        seeAllNextFocusDown={hasMore ? seeAllFocus.nextFocusDown : undefined}
      />
      <PosterRail
        title={title}
        items={page}
        loading={loading && page.length === 0}
        itemWidth={layout.posterWidthDetail}
        flush
        hideTitle
        onItemPress={onItemPress}
        restorePath={focusPath}
        railFocusPriority={railPriority}
      />
    </View>
  );
}
