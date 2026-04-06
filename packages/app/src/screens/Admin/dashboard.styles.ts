import { StyleSheet, Platform, Dimensions } from 'react-native';

type DashboardViewport = {
  width: number;
  height: number;
};

export function dashboardStyles(viewport?: DashboardViewport) {
  const { width, height } = viewport ?? Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isNarrowWeb = Platform.OS === 'web' && width < 420;
  const isShortViewport = height < 700;

  const colors = {
    pageBg: '#071425',
    pageOverlay: '#0A1D33',
    panel: 'rgba(7, 24, 42, 0.72)',
    panelStrong: 'rgba(7, 24, 42, 0.88)',
    panelMuted: 'rgba(19, 46, 76, 0.65)',
    border: 'rgba(159, 207, 255, 0.18)',
    borderStrong: 'rgba(159, 207, 255, 0.28)',
    textPrimary: '#E6F3FF',
    textSecondary: '#A9C6E4',
    textMuted: '#7FA2C8',
    accent: '#34D399',
    accentWarm: '#F59E0B',
    accentDanger: '#F97373',
    white: '#FFFFFF',
  };

  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.pageBg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: {
      flex: 1,
      paddingHorizontal: isDesktopWeb ? 18 : 0,
      paddingVertical: isDesktopWeb ? 18 : 0,
    },
    mainScroll: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },

    leftPanel: {
      width: isDesktopWeb ? '25%' : '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isShortViewport ? 14 : 20,
      borderRadius: 24,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.border,
    },
    leftPanelName: {
      fontSize: 30,
      fontWeight: '800',
      marginTop: 10,
      color: colors.textPrimary,
    },
    leftPanelRole: {
      fontSize: 20,
      color: colors.textSecondary,
    },
    leftPanelImage: {
      width: 200,
      height: 200,
      resizeMode: 'contain',
      marginBottom: 20,
    },
    leftPanelTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 38,
    },
    leftPanelSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 10,
    },

    rightPanel: {
      flex: 1,
      backgroundColor: colors.panel,
      borderRadius: isDesktopWeb ? 26 : 0,
      borderWidth: isDesktopWeb ? 1 : 0,
      borderColor: colors.border,
      padding: isShortViewport ? 14 : 20,
    },
    mobilePadding: {
      padding: 14,
    },
    idBadge: {
      marginTop: 10,
      backgroundColor: colors.panelMuted,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    idBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 0.4,
    },

    mobileHeaderCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.panelStrong,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 16,
      borderRadius: 18,
      marginBottom: 16,
      shadowColor: '#001325',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    mobileUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mobileAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    mobileWelcome: {
      fontSize: 11,
      color: colors.textMuted,
    },
    mobileAdminName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.panelMuted,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    userText: {
      marginLeft: 8,
      marginRight: 14,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
      width: '100%',
    },
    metricBox: {
      width: isDesktopWeb ? '23.5%' : isNarrowWeb ? '100%' : '48%',
      backgroundColor: colors.panelStrong,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: isShortViewport ? 12 : 14,
      marginBottom: 14,
      minHeight: 110,
      shadowColor: '#001628',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 5,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 8,
    },
    metricValue: {
      fontSize: isDesktopWeb ? 28 : 24,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 10,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    metricValueText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 8,
    },
    metricSubLabel: {
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
    },
    fieldMetricBox: {
      alignItems: 'flex-start',
    },
    fieldLocationGrid: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      width: '100%',
    },
    fieldLocationCell: {
      backgroundColor: 'rgba(16, 45, 75, 0.95)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 6,
      minWidth: 72,
      flexGrow: 1,
    },
    fieldLocationName: {
      fontSize: 10,
      color: colors.textMuted,
    },
    fieldLocationCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      marginTop: 1,
    },
    fieldLocationEmpty: {
      fontSize: 11,
      color: colors.textMuted,
    },

    bottomRow: {
      flexDirection: isDesktopWeb ? 'row' : 'column',
      justifyContent: 'space-between',
      width: '100%',
      gap: isShortViewport ? 14 : 18,
      marginTop: 6,
    },
    feedContainer: {
      flex: isDesktopWeb ? 3 : 1,
    },
    actionsContainer: {
      flex: isDesktopWeb ? 1 : 1,
    },
    bottomContent: {
      flex: 1,
      flexDirection: isDesktopWeb ? 'row' : 'column',
      gap: isShortViewport ? 12 : 20,
    },
    userSection: {
      flex: 2.5,
    },
    quickActionsSection: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
      marginTop: 6,
      letterSpacing: 0.2,
    },
    userTable: {
      backgroundColor: colors.panelStrong,
      borderRadius: 14,
      padding: 14,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
      marginBottom: 10,
    },
    headerCell: {
      flex: 1,
      fontWeight: '700',
      color: colors.textSecondary,
      fontSize: 12,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    cellText: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
    },
    actionCell: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },

    floatingAction: {
      position: isDesktopWeb ? 'relative' : 'absolute',
      bottom: isDesktopWeb ? 0 : 20,
      left: isDesktopWeb ? 0 : 16,
      right: isDesktopWeb ? 0 : 16,
    },
    addUserButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      shadowColor: '#001325',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    addUserButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
      marginLeft: 8,
      letterSpacing: 0.2,
    },
    actionText: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: 13,
    },
    bottomNav: {
      display: 'none',
    },

    notificationFeed: {
      backgroundColor: colors.panelStrong,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      minHeight: 200,
      width: '100%',
      shadowColor: '#001325',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.26,
      shadowRadius: 14,
      elevation: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
      fontStyle: 'italic',
    },

    notifGroup: {
      marginBottom: 14,
      borderRadius: 12,
      backgroundColor: 'rgba(10, 35, 62, 0.95)',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 13,
      backgroundColor: 'rgba(22, 51, 83, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    },
    groupHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    groupIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 10,
    },
    groupSenderName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginRight: 10,
    },
    notifBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    notifBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },

    roleIndicator: {
      width: 4,
      height: 40,
      borderRadius: 2,
      marginRight: 12,
    },
    notifMainContent: {
      flex: 1,
    },
    senderName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    roleTag: {
      fontWeight: '400',
      color: colors.textMuted,
      fontSize: 11,
    },
    notifMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 3,
      fontStyle: 'italic',
    },
    notifTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 'auto',
    },
    notifLine: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(126, 170, 218, 0.15)',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(8, 28, 50, 0.95)',
    },
    notifHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    tagContainer: {
      backgroundColor: 'rgba(52, 211, 153, 0.18)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.45)',
    },
    roleTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#A7F3D0',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    assetContext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 2,
    },
    tapToHideText: {
      fontSize: 10,
      color: colors.accentWarm,
      marginTop: 7,
      fontWeight: '600',
    },
  });
}
