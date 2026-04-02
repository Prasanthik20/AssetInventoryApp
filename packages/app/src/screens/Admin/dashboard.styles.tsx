import { StyleSheet, Platform, Dimensions } from 'react-native'; // Ensure this import is present
import { globalColors } from 'src/styles/globalStyles';

type DashboardViewport = {
  width: number;
  height: number;
};

export function dashboardStyles(viewport?: DashboardViewport) {
  const { width, height } = viewport ?? Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isNarrowWeb = Platform.OS === 'web' && width < 420;
  const isShortViewport = height < 700;

  return StyleSheet.create({
     backgroundImage: {
     flex: 1,
      flexDirection: isDesktopWeb ? 'row' : 'column',
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: globalColors.backgroundSoft,
  },
  container: {
    flex: 1,
    flexDirection: isDesktopWeb ? 'row' : 'column',
  },
  mainScroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  leftPanel: {
     width: isDesktopWeb ? '25%' : '100%',
    justifyContent: 'center',
    backgroundColor: globalColors.backgroundSoftAlt,
    alignItems: 'center',
    padding: isShortViewport ? 14 : 20,
  },
  leftPanelName: { fontSize: 32, fontWeight: 'bold', marginTop: 10, color: globalColors.textTitle },
  leftPanelRole: { fontSize: 24, color: globalColors.textSoft },
  leftPanelImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  leftPanelTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: globalColors.textInverse,
    textAlign: 'center',
    lineHeight: 40,
  },
  leftPanelSubtitle: {
    fontSize: 18,
    color: '#E0E0FF',
    opacity: 0.8,
    marginTop: 10,
  },
  // Right Panel & Mobile Adapters
  rightPanel: {
    flex: 1,
    backgroundColor: isDesktopWeb ? globalColors.backgroundSoft : 'transparent',
    padding: isShortViewport ? 16 : 25,
  },
  mobilePadding: { padding: 15 },
  idBadge: {
    marginTop: 10,
    backgroundColor: globalColors.surfaceGlass,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: globalColors.borderGlass,
  },
  idBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: globalColors.textBody,
    letterSpacing: 0.5,
  },
  mobileHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: globalColors.surfaceGlassLight,
    padding: 20,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mobileUserRow: { flexDirection: 'row', alignItems: 'center' },
  mobileAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  mobileWelcome: { fontSize: 12, color: globalColors.textSoft },
  mobileAdminName: { fontSize: 18, fontWeight: 'bold', color: globalColors.textBody },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold', // Bolder text for better contrast
    color: globalColors.textTitle, // Darker text color
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    // --- MODIFICATION: Made background semi-transparent ---
    backgroundColor: globalColors.surfaceGlass,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  userText: {
    marginLeft: 8,
    marginRight: 15,
    fontSize: 14,
    fontWeight: '600', // Bolder
    color: globalColors.textBody, // Darker
  },
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  metricBox: {
    // 23.5% width allows 4 items + spacing in one row on web
   width: isDesktopWeb ? '23.5%' : isNarrowWeb ? '100%' : '48%',
    backgroundColor: globalColors.surfacePrimary,
    borderRadius: 20,
    padding: isShortViewport ? 14 : 20,
    marginBottom: 15,
    alignItems: 'flex-start',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
     metricRow: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 10,
    },
  metricValue: { fontSize: 24, fontWeight: 'bold', color: globalColors.textTitle },
  metricLabel: { fontSize: 13, color: globalColors.textSoft, fontWeight: '600' },
  metricValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: globalColors.textBody,
    textAlign: 'center',
    marginTop: 8,
  },
  metricSubLabel: {
    fontSize: 11,
    color: globalColors.textSoft,
    textAlign: 'center',
  },
  fieldMetricBox: {
    alignItems: 'stretch',
  },
  fieldLocationGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  fieldLocationCell: {
    backgroundColor: globalColors.surfaceSoft,
    borderWidth: 1,
    borderColor: globalColors.borderSoft,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 72,
    flexGrow: 1,
  },
  fieldLocationName: {
    fontSize: 10,
    color: globalColors.textSecondary,
  },
  fieldLocationCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  fieldLocationEmpty: {
    fontSize: 11,
    color: '#64748B',
  },
  bottomRow: {
    flexDirection: isDesktopWeb ? 'row' : 'column',
    justifyContent: 'space-between',
    width: '100%',
    gap: isShortViewport ? 16 : 25,
  },
  feedContainer: {
     flex: isDesktopWeb ? 3 : 1, // Takes 75% of space on web
  },
  actionsContainer: {
    flex: isDesktopWeb ? 1 : 1, // Takes 25% of space on web
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 15,
    marginTop: 10,
  },
  userTable: {
    // --- MODIFICATION: Made background semi-transparent ---
    backgroundColor: globalColors.surfaceGlassStrong,
    borderRadius: 15,
    padding: 15,
    flex: 1,
    borderWidth: 1,
    borderColor: globalColors.borderGlass,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: globalColors.borderSoft,
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    color: globalColors.textSecondary,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cellText: {
    flex: 1,
    fontSize: 14,
    color: globalColors.textBody,
  },
  actionCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  // Floating Button for Mobile
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
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 8,
  },
  addUserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionText: {
    color: '#5A67D8', // Adjusted color for better visibility
    fontWeight: 'bold',
    fontSize: 13,
  },
  bottomNav: {
    display: 'none',
  },
  notificationFeed: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Solid white or high-opacity glass
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',

    // --- THIS FORCES THE CARD TO BE VISIBLE IRRESPECTIVE OF CONTENT ---
    minHeight: 200, // Adjust this value to match your Quick Actions height
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: '#718096',
    fontSize: 16,
    fontStyle: 'italic',
  },
  notifGroup: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#EDF2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E0',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  notifMainContent: { flex: 1 },
  senderName: { fontSize: 15, fontWeight: 'bold', color: '#2D3748' },
  roleTag: { fontWeight: 'normal', color: '#A0AEC0', fontSize: 11 },
  notifMessage: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 2,
    fontStyle: 'italic',
  },
  notifTime: { fontSize: 11, color: '#CBD5E0', marginLeft: 'auto' },
  notifLine: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagContainer: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4A5568',
    textTransform: 'uppercase',
  },
  assetContext: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    marginBottom: 4,
  },
  tapToHideText: {
    fontSize: 11,
    color: '#A0AEC0',
    fontStyle: 'italic',
    marginTop: 6,
  },
  });
}