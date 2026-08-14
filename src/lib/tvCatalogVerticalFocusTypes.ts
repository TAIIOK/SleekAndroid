export type TvCatalogRailSlot = {
  priority: number;
  tag: number;
};

export type TvCatalogVerticalSnapshot = {
  chromePrimaryTag?: number;
  chromeSecondaryTag?: number;
  rails: TvCatalogRailSlot[];
};
