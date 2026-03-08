import { StyleSheet, Platform } from 'react-native'; // Ensure this import is present

export function opratorStyles() {
  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    safeArea: {
      flex: 1,
      backgroundColor: 'rgba(61, 138, 233, 0.52)',
    },
    assetNameContainer: { flex: 1 },
    dueDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    overdueText: { color: '#DC3545', fontWeight: 'bold' },
    notifyButton: {
      marginLeft: 10,
      backgroundColor: '#DC3545',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    notifyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    container: {
      flex: 1,
      flexDirection: Platform.OS !== 'web' ? 'column' : 'row',
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
      color: '#fff',
      textAlign: 'center',
      lineHeight: 40,
    },
    leftPanelSubtitle: {
      fontSize: 16,
      color: '#E0E0FF',
      marginTop: 10,
      opacity: 0.8,
    },

    rightPanel: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.4)',
      padding: 25,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      alignItems: 'center',
      width: '100%',
      paddingVertical: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000ff' },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.7)',
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

    metricsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    metricBox: {
      width: '48%',
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 15,
      padding: 20,
    },
    metricRow: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 10,
    },
    metricIconBg: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(59,89,184,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    metricTitle: { fontSize: 22, color: '#4A5568', fontWeight: '500' },
    metricValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#1A202C',
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
    },
    locationCell: {
      width: '48%',
      backgroundColor: 'rgba(59,89,184,0.08)',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
      minHeight: 56,
      justifyContent: 'space-between',
    },
    locationName: {
      fontSize: 12,
      color: '#334155',
      fontWeight: '600',
    },
    locationCount: {
      fontSize: 18,
      color: '#1E3A8A',
      fontWeight: '800',
      marginTop: 4,
    },

    assetsSection: { marginBottom: 20 },
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
      color: '#3a0202',
      marginBottom: 15,
    },
    subSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#02224b',
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
    replyRowItemWeb: {
      width: '100%',
    },

    assetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
    },
    repliedText: {
      marginTop: 5,
      fontSize: 13,
      color: '#0369a1',
      backgroundColor: '#e0f2fe',
      padding: 5,
      borderRadius: 4,
    },
    replyButton: {
      backgroundColor: '#0284c7',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    replyButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 12,
    },

    assetIconBg: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },

    assetName: { fontSize: 15, fontWeight: '600', color: '#2D3748' },
    assetDueDate: { fontSize: 14, color: '#4A5568', fontWeight: '500' },

    returnButton: {
      paddingVertical: 18,
      borderRadius: 15,
      alignItems: 'center',
    },
    returnButtonText: {
      color: '#fff',
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
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    showMoreButton: {
      marginTop: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    showMoreText: {
      color: '#023262',
      fontSize: 12,
      fontWeight: '700',
    },
    noItemsText: {
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 10,
      fontStyle: 'italic',
    },
    notificationItem: {
      flexDirection: 'row', // Align icon, text, and button horizontally
      alignItems: 'center', // Center items vertically
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: '#f0f9ff',
      borderWidth: 1,
      borderColor: '#bae6fd',
    },
    notificationContent: {
      flex: 1, // Take up remaining space so button stays on the right
      marginLeft: 10,
      marginRight: 10,
    },
    notificationText: {
      fontSize: 14,
      color: '#4A5568',
    },
    notificationReason: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1A202C',
      marginTop: 4,
    },
  });
}
