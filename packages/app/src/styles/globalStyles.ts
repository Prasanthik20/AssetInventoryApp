import { ImageStyle, ViewStyle } from 'react-native';

type GlobalStyleTokens = {
  pageBackgroundImage: ImageStyle;
  safeAreaOverlay: ViewStyle;
  safeAreaOverlayCentered: ViewStyle;
  shellContainerCard: ViewStyle;
  shellHeaderDark: ViewStyle;
  searchBoxBase: ViewStyle;
};

export const globalStyleTokens: GlobalStyleTokens = {
  pageBackgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeAreaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 138, 233, 0.4)',
  },
  safeAreaOverlayCentered: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(61, 138, 233, 0.4)',
  },
  shellContainerCard: {
    width: '90%',
    maxWidth: 1100,
    height: '90%',
    backgroundColor: '#F3F4F8',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  shellHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(60, 60, 80, 0.7)',
    padding: 15,
  },
  searchBoxBase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
};

export const globalColors = {
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  textTitle: '#1A202C',
  textBody: '#2D3748',
  textSoft: '#718096',
  surfacePrimary: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  surfaceMuted: '#EEF2F7',
  surfaceGlass: 'rgba(255, 255, 255, 0.4)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.7)',
  surfaceGlassLight: 'rgba(255, 255, 255, 0.85)',
  borderSoft: '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderGlass: 'rgba(255, 255, 255, 0.8)',
  brandPrimary: '#3B59B8',
  brandAccent: '#27B2C3',
  brandBlue: '#4A90E2',
  brandIndigo: '#5A67D8',
  brandRed: '#DC3545',
  brandGreen: '#28A745',
  overlayDark: 'rgba(15, 23, 42, 0.5)',
  shellGlass: 'rgba(255, 255, 255, 0.78)',
  backgroundSoft: 'rgba(61, 138, 233, 0.4)',
  backgroundSoftAlt: 'rgba(61, 138, 233, 0.52)',
  backgroundPanel: 'rgba(60, 60, 80, 0.7)',
  backgroundPanelSolid: 'rgba(60, 60, 80, 0.85)',
};

export const globalTypography = {
  titleLg: 20,
  titleMd: 18,
  bodyMd: 15,
  bodySm: 14,
  caption: 12,
  weightBold: '700' as const,
  weightSemiBold: '600' as const,
  weightMedium: '500' as const,
};
