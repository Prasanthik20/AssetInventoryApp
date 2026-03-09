import { Platform, StyleSheet } from 'react-native';
import { assignStyles } from './assign.styles';

export function fieldStyles(isMobileLayout: boolean) {
  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    safeArea: {
      flex: 1,
      width: '100%',
      // Redundant but safe, ensures content is centered
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(61, 138, 233, 0.4)',
    },
    container: {
      width: '90%',
      maxWidth: 1100,
      height: '90%',
      backgroundColor: '#F3F4F8', // Solid light background
      borderRadius: 25,
      overflow: 'hidden',
      // Softer shadow to match the image
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(60, 60, 80, 0.6)',
      padding: 15,
    },
    backButton: {
      padding: 5,
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
