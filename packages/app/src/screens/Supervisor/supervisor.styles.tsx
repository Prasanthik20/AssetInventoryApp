import { StyleSheet, Platform } from 'react-native'; // Ensure this import is present

type DashboardViewport = {
  width: number;
  height: number;
};

export function supervisorStyles(viewport?: DashboardViewport) {
  const width = viewport?.width ?? 1024;
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    return StyleSheet.create({
         backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: { flex: 1, backgroundColor: 'rgba(61, 138, 233, 0.52)' },
  screenScroll: {
    flex: 1,
  },
  screenScrollContent: {
    paddingBottom: 16,
  },
  container: { padding: 20, gap: 20 },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Important to allow scrolling above the fixed bottom nav
  },

  header: {
    flexDirection: 'row',
    marginTop: 30,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  userText: {
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  metricRow: {
    display: 'flex',
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
    color: '#1A202C',
    fontWeight: '500',
    marginTop: 8,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A202C',
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
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 70,
    flexGrow: 1,
  },
  locationMiniName: {
    fontSize: 10,
    color: '#334155',
  },
  locationMiniCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  locationMiniEmpty: {
    fontSize: 11,
    color: '#64748b',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 15,
    padding: 15,
    // Provide a bottom margin so the last item isn't covered by bottom nav
    marginBottom: 0,
    minWidth: 'auto',
    minHeight: 'auto',
  },
  actionsSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10, // CHANGE THIS from 80 to 0
    minWidth: 'auto',
    minHeight: 'auto',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10, // Reduced from 15
    marginTop: 0, // Explicitly set to 0
    color: '#000000ff',
  },
  noItemsText: { color: 'rgba(0, 0, 0, 0.8)', fontStyle: 'italic' },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(230, 235, 255, 0.8)',
    padding: 12,
    borderRadius: 10,
  },
  activityTextContainer: { flex: 1, marginLeft: 15, minWidth: 0 },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
    flexWrap: 'wrap',
  },
  activitySubtext: {
    fontSize: 15,
    color: '#1A202C',
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 3,
    flexShrink: 1,
  },
  extendButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  extendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  blueButton: { backgroundColor: '#4A90E2' },
  whiteButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  whiteButtonText: { color: '#4A90E2' },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10, // Added margin at the bottom
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000000ff' },
  bottomNavLeft: { flexDirection: 'row', alignItems: 'center' },
  bottomNavRight: { flexDirection: 'row', alignItems: 'center' },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  navText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#1A202C' },

  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalBox: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: { color: '#000000ff', fontSize: 16, fontWeight: 'bold' },
  modalCancel: { marginTop: 15, padding: 10 },

  actionButton: {
    flexDirection: 'row',
    padding: 12, // Reduced from 15
    borderRadius: 12,
    marginBottom: 8, // Reduced from 12 to 8
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 10,
    marginRight: 15,
  },
  actionIcon: {
    marginRight: 10,
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
    });
}