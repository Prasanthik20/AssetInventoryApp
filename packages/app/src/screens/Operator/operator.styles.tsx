import { StyleSheet, Platform } from 'react-native';

type DashboardViewport = {
  width: number;
  height: number;
};

export function opratorStyles(viewport?: DashboardViewport) {
  const width = viewport?.width ?? 1024;
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;

  const theme = {
    page: '#071425',
    panel: 'rgba(7, 24, 42, 0.82)',
    panelStrong: 'rgba(7, 24, 42, 0.9)',
    panelMuted: 'rgba(18, 45, 73, 0.86)',
    panelSoft: 'rgba(7, 24, 42, 0.92)',
    border: 'rgba(159, 207, 255, 0.22)',
    textPrimary: '#E6F3FF',
    textSecondary: '#A9C6E4',
    accent: '#22D3EE',
    accentSuccess: '#34D399',
    accentWarn: '#F97373',
    white: '#FFFFFF',
  };

  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.page,
    },
    assetNameContainer: { flex: 1 },
    dueDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    overdueText: { color: theme.accentWarn, fontWeight: 'bold' },
    notifyButton: {
      marginLeft: 10,
      backgroundColor: theme.accentWarn,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    notifyButtonText: { color: theme.white, fontWeight: 'bold', fontSize: 13 },
    container: {
      flex: 1,
      flexDirection: isDesktopWeb ? 'row' : 'column',
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.border,
    },
    leftPanel: {
      width: '40%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    leftPanelImage: {
      width: 200,
      height: 200,
      resizeMode: 'contain',
      marginBottom: 30,
    },
    leftPanelTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.textPrimary,
      textAlign: 'center',
      lineHeight: 40,
    },
    leftPanelSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 10,
      opacity: 0.8,
    },

    rightPanel: {
      flex: 1,
      backgroundColor: theme.panel,
      padding: isDesktopWeb ? 20 : 14,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 6,
      paddingVertical: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    userText: {
      marginLeft: 8,
      marginRight: 8,
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },

    metricsContainer: {
      flexDirection: isDesktopWeb ? 'row' : 'column',
      justifyContent: 'space-between',
      marginBottom: 18,
      gap: isDesktopWeb ? 10 : 10,
    },
    metricBox: {
      width: isDesktopWeb ? '49%' : '100%',
      backgroundColor: theme.panelMuted,
      borderRadius: 15,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 10,
    },
    metricIconBg: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.panelSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metricTitle: { fontSize: 18, color: theme.textSecondary, fontWeight: '500' },
    metricValue: {
      fontSize: 30,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginTop: 5,
    },
    locationMetricValue: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
    },
    locationGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      justifyContent: 'space-between',
      gap: 8,
    },
    locationCell: {
      width: '48%',
      backgroundColor: theme.panelSoft,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
      minHeight: 56,
      justifyContent: 'space-between',
    },
    locationName: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    locationCount: {
      fontSize: 18,
      color: theme.accentSuccess,
      fontWeight: '800',
      marginTop: 4,
    },

    assetsSection: {
      marginBottom: 18,
      backgroundColor: theme.panelMuted,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
    },
    dashboardTwoColumnRow: {
      flexDirection: 'column',
      gap: 16,
    },
    dashboardTwoColumnRowWeb: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    dashboardColumn: {
      width: '100%',
    },
    dashboardColumnWeb: {
      width: '49%',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 12,
    },
    subSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 10,
    },
    notificationsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 10,
    },
    replyRowContainer: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 10,
    },
    replyRowContainerWeb: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 10,
    },
    notificationsInnerScroll: {
      maxHeight: isDesktopWeb ? 340 : 260,
      width: '100%',
    },
    notificationsInnerScrollContent: {
      paddingBottom: 4,
    },
    replyRowItemWeb: {
      width: '100%',
    },

    assetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.panelSoft,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    repliedText: {
      marginTop: 5,
      fontSize: 13,
      color: theme.accent,
      backgroundColor: theme.panelSoft,
      padding: 5,
      borderRadius: 4,
    },
    replyButton: {
      backgroundColor: theme.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    replyButtonText: {
      color: theme.white,
      fontWeight: 'bold',
      fontSize: 12,
    },

    assetIconBg: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.panelMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },

    assetName: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
    assetDueDate: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' , paddingHorizontal:10},

    returnButton: {
      paddingVertical: 18,
      borderRadius: 15,
      alignItems: 'center',
    },
    returnButtonText: {
      color: theme.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
    returnButtonCompact: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    returnButtonCompactText: {
      color: theme.white,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    showMoreButton: {
      marginTop: 6,
      alignSelf: 'flex-start',
      backgroundColor: theme.panelSoft,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    showMoreText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    noItemsText: {
      color: theme.textSecondary,
      marginTop: 10,
      fontStyle: 'italic',
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: theme.panelSoft,
      borderWidth: 1,
      borderColor: theme.border,
    },
    notificationContent: {
      flex: 1,
      marginLeft: 10,
      marginRight: 10,
    },
    notificationText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    notificationReason: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
      marginTop: 4,
    },
  });
}
