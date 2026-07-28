import { ImageStyle, ViewStyle } from 'react-native';
import {
  colors,
  darkColors,
  spacing,
  typography,
  shadows,
  borderRadius,
  layout,
  componentStyles,
} from '../theme';

export const globalColors = {
  ...colors,
  ...{
    textTitle: colors.textPrimary,
    textBody: colors.textSecondary,
    textSoft: colors.textMuted,
    textInverse: colors.white,
    surfacePrimary: colors.surface,
    surfaceSoft: '#F8FAFC',
    surfaceMuted: '#EEF2F7',
    surfaceGlass: 'rgba(255, 255, 255, 0.4)',
    surfaceGlassStrong: 'rgba(255, 255, 255, 0.7)',
    surfaceGlassLight: 'rgba(255, 255, 255, 0.85)',
    borderSoft: colors.border,
    borderDefault: '#CBD5E1',
    borderGlass: 'rgba(255, 255, 255, 0.8)',
    brandPrimary: colors.primary,
    brandAccent: colors.accent,
    brandBlue: colors.secondary,
    brandIndigo: colors.secondary,
    brandRed: colors.danger,
    brandGreen: colors.success,
    overlayDark: colors.overlay,
    shellGlass: 'rgba(255, 255, 255, 0.78)',
    backgroundSoft: colors.overlaySoft,
    backgroundSoftAlt: 'rgba(61, 138, 233, 0.52)',
    backgroundPanel: 'rgba(60, 60, 80, 0.7)',
    backgroundPanelSolid: 'rgba(60, 60, 80, 0.85)',
  },
  // New UI tokens for redesign
  surfaceCard: 'rgba(255,255,255,0.08)',
  borderSoftCard: 'rgba(255,255,255,0.2)',
  accentPrimary: colors.primary,
} as const;

export const globalTypography = {
  headingXL: typography.headingXL,
  headingLG: typography.headingLG,
  headingMD: typography.headingMD,
  bodyLG: typography.bodyLG,
  bodyMD: typography.bodyMD,
  bodySM: typography.bodySM,
  caption: typography.caption.fontSize,
  buttonText: typography.buttonText,
  titleLg: typography.headingLG.fontSize,
  titleMd: typography.headingMD.fontSize,
  bodyMd: typography.bodyMD.fontSize,
  bodySm: typography.bodySM.fontSize,
  weightBold: '700' as const,
  weightSemiBold: '600' as const,
  weightMedium: '500' as const,
} as const;

export const globalStyleTokens = {
  pageBackgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  } as ImageStyle,
  safeAreaOverlay: {
    flex: 1,
    backgroundColor: globalColors.backgroundSoft,
  } as ViewStyle,
  safeAreaOverlayCentered: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: globalColors.backgroundSoft,
  } as ViewStyle,
  shellContainerCard: {
    width: '90%',
    maxWidth: 1100,
    height: '90%',
    backgroundColor: globalColors.surfacePrimary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.strong,
  } as ViewStyle,
  shellHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: globalColors.backgroundPanel,
    padding: spacing.lg,
  } as ViewStyle,
  searchBoxBase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: globalColors.surfacePrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
  } as ViewStyle,
};

export { colors, darkColors, spacing, typography, shadows, borderRadius, layout, componentStyles };
