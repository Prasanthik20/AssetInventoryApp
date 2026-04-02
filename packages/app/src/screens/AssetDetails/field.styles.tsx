import { Platform, StyleSheet } from 'react-native';
import { assignStyles } from './assign.styles';
import { globalStyleTokens } from 'src/styles/globalStyles';

export function fieldStyles(isMobileLayout: boolean) {
  return StyleSheet.create({
    backgroundImage: {
      ...globalStyleTokens.pageBackgroundImage,
      justifyContent: 'center',
      alignItems: 'center',
    },
    safeArea: globalStyleTokens.safeAreaOverlayCentered,
    container: globalStyleTokens.shellContainerCard,
    header: {
      ...globalStyleTokens.shellHeaderDark,
      backgroundColor: 'rgba(60, 60, 80, 1)',
    },
    backButton: {
      padding: 10,
      width: 40,
    },

    headerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      margin: 20,
      borderRadius: 10,
      paddingHorizontal: 15,
    },
    searchIcon: {
      marginRight: 10,
    },

    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },

    notifyText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

export default assignStyles;
