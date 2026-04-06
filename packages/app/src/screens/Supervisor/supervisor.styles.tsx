import { StyleSheet, Platform } from 'react-native';

type DashboardViewport = {
  width: number;
  height: number;
};

export function supervisorStyles(viewport?: DashboardViewport) {
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
    safeArea: { flex: 1, backgroundColor: theme.page },
    screenScroll: {
      flex: 1,
    },
    screenScrollContent: {
      paddingBottom: 16,
    },
    container: {
      padding: 16,
      gap: 16,
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.border,
      marginHorizontal: isDesktopWeb ? 12 : 0,
      marginBottom: isDesktopWeb ? 12 : 0,
      borderRadius: isDesktopWeb ? 18 : 0,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },

    header: {
      flexDirection: 'row',
      marginTop: 18,
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      alignItems: 'center',
    },
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
    metricsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    metricBox: {
      flex: 1,
      backgroundColor: theme.panelMuted,
      borderRadius: 14,
      padding: 14,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: theme.border,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 10,
    },
    metricBoxField: {
      alignItems: 'stretch',
    },
    metricTitle: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
      marginTop: 6,
    },
    metricValue: {
      fontSize: 30,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginTop: 4,
    },
    locationMiniGrid: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      width: '100%',
    },
    locationMiniCell: {
      backgroundColor: theme.panelSoft,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 6,
      minWidth: 70,
      flexGrow: 1,
    },
    locationMiniName: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    locationMiniCount: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.accentSuccess,
    },
    locationMiniEmpty: {
      fontSize: 11,
      color: theme.textSecondary,
    },

    mainContent: {
      flex: 1,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      minWidth: 'auto',
      height: 'auto',
    },
    mobileStack: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 0,
      paddingBottom: 16,
    },
    mobileBlockTop: {
      marginBottom: 14,
    },
    mobileBlockBottom: {
      marginTop: 0,
    },
    activitySection: {
      flex: 1,
      backgroundColor: theme.panelMuted,
      borderRadius: 14,
      padding: 14,
      marginBottom: 0,
      minWidth: 'auto',
      minHeight: 'auto',
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionsSection: {
      flex: 1,
      backgroundColor: theme.panelMuted,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      minWidth: 'auto',
      minHeight: 'auto',
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      marginTop: 0,
      color: theme.textPrimary,
    },
    noItemsText: { color: theme.textSecondary, fontStyle: 'italic' },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      backgroundColor: theme.panelSoft,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    activityTextContainer: { flex: 1, marginLeft: 12, minWidth: 0 },
    activityText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
      flexWrap: 'wrap',
    },
    activitySubtext: {
      fontSize: 14,
      color: theme.textPrimary,
      fontWeight: '600',
      fontStyle: 'italic',
      marginTop: 3,
      flexShrink: 1,
    },
    extendButton: {
      backgroundColor: theme.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    extendButtonText: { color: theme.white, fontWeight: 'bold', fontSize: 13 },
    blueButton: { backgroundColor: '#0EA5E9' },
    whiteButton: {
      backgroundColor: theme.panelSoft,
      borderWidth: 1,
      borderColor: theme.border,
    },
    whiteButtonText: { color: theme.accent },

    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      marginHorizontal: 20,
      marginBottom: 10,
      backgroundColor: theme.panelMuted,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textPrimary },
    bottomNavLeft: { flexDirection: 'row', alignItems: 'center' },
    bottomNavRight: { flexDirection: 'row', alignItems: 'center' },
    navItem: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    navText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: theme.textSecondary },

    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalBox: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: theme.panelStrong,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 25,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    modalButton: {
      width: '100%',
      backgroundColor: theme.accent,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    modalButtonText: { color: theme.white, fontSize: 16, fontWeight: 'bold' },
    modalCancel: { marginTop: 15, padding: 10 },

    actionButton: {
      flexDirection: 'row',
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    logoBg: {
      backgroundColor: theme.panelMuted,
      padding: 8,
      borderRadius: 10,
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionIcon: {
      marginRight: 10,
    },

    actionButtonText: {
      color: theme.white,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
