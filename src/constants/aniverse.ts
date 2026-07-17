import { Platform } from 'react-native';

export const fonts = {
  regular: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'System' }),
  semibold: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'System' }),
  bold: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'System' }),
};

export const colors = {
  bg: '#13121b',
  bgCard: '#1f1f28',
  bgLow: '#1b1b24',
  bgElevated: '#2a2933',
  brand: '#c3c0ff',
  brandAccent: '#4f46e5',
  brandTint: '#dad7ff',
  brandOn: '#1d00a5',
  text: '#e4e1ee',
  textSecondary: '#c7c4d8',
  textMuted: '#918fa1',
  stroke: '#464555',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.05)',
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(19,18,27,0.9)',
  danger: '#f87171',
  focus: '#4f46e5',
  focusGlow: 'rgba(195,192,255,0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const layout = {
  tvSideNavWidth: 288,
  mobileTopBarHeight: 56,
  mobileTabHeight: 84,
  mobileTabMaxWidth: 512,
  gutterMobile: 16,
  gutterDesktop: 48,
  posterAspect: 120 / 170,
  posterWidthRail: Platform.isTV ? 184 : 120,
  posterWidthShowcase: Platform.isTV ? 180 : 140,
  maxContentWidth: 1440,
  continueCardWidth: Platform.isTV ? 280 : 260,
  quickActionCardWidth: 168,
  quickActionCardHeight: 88,
};

export function mobileTopChromeInset(safeTop: number): number {
  return Math.max(safeTop, 12) + layout.mobileTopBarHeight + 8;
}

export function mobileBottomChromeInset(safeBottom: number): number {
  return Math.max(safeBottom, 12) + layout.mobileTabHeight;
}

export const typography = {
  headlineLg: {
    fontSize: Platform.isTV ? 32 : 24,
    lineHeight: Platform.isTV ? 40 : 32,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  titleMd: {
    fontSize: Platform.isTV ? 22 : 20,
    lineHeight: Platform.isTV ? 30 : 28,
    fontWeight: '600' as const,
  },
  homeContinueTitle: {
    fontSize: Platform.isTV ? 32 : 20,
    lineHeight: Platform.isTV ? 40 : 28,
    fontWeight: '600' as const,
  },
  homeQuickTitle: {
    fontSize: Platform.isTV ? 32 : 18,
    lineHeight: Platform.isTV ? 40 : 24,
    fontWeight: '600' as const,
  },
  homeGroupTitle: {
    fontSize: Platform.isTV ? 32 : 24,
    lineHeight: Platform.isTV ? 40 : 32,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  railTitle: {
    fontSize: Platform.isTV ? 28 : 24,
    lineHeight: Platform.isTV ? 36 : 32,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontSize: Platform.isTV ? 14 : 13,
    lineHeight: Platform.isTV ? 20 : 18,
    fontWeight: '600' as const,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  labelCaps: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600' as const,
  },
};

export const radii = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  quickAction: 14,
};
