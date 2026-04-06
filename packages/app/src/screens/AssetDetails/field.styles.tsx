import { Platform, StyleSheet } from 'react-native';
import { globalColors, globalStyleTokens } from '../../styles/globalStyles';

export function fieldStyles(isMobileLayout: boolean) {
  const theme = {
    page: '#071425',
    panel: 'rgba(7, 24, 42, 0.82)',
    panelMuted: 'rgba(18, 45, 73, 0.86)',
    border: 'rgba(159, 207, 255, 0.22)',
    textPrimary: '#E6F3FF',
    textSecondary: '#A9C6E4',
  };

  return StyleSheet.create({
    backgroundImage: {
      ...globalStyleTokens.pageBackgroundImage,
    },
    safeArea: { ...globalStyleTokens.safeAreaOverlay, backgroundColor: theme.page },
    container: {
      flex: 1,
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      ...globalStyleTokens.shellHeaderDark,
    },
    backButton: {
      padding: 10,
      width: 40,
    },

    headerTitle: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.panelMuted,
      margin: 20,
      borderRadius: 10,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchIcon: {
      marginRight: 10,
    },

    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.panelMuted,
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      shadowColor: globalColors.overlayDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },

    notifyText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

export default fieldStyles;
