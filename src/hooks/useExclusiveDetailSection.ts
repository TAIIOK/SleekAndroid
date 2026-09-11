import { useCallback, useState } from 'react';

import {
  toggleExclusiveDetailSection,
  type DetailExtraSection,
} from '@/lib/detailSections';

export function useExclusiveDetailSection() {
  const [openId, setOpenId] = useState<DetailExtraSection | null>(null);

  const toggle = useCallback((id: DetailExtraSection) => {
    setOpenId((current) => toggleExclusiveDetailSection(current, id));
  }, []);

  const isOpen = useCallback((id: DetailExtraSection) => openId === id, [openId]);

  return { openId, toggle, isOpen };
}
