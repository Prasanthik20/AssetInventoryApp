import { Platform, StyleSheet } from 'react-native';
import { globalStyleTokens } from 'src/styles/globalStyles';

export function assetStyles(isMobileLayout: boolean) {
  return StyleSheet.create({
    backgroundImage: globalStyleTokens.pageBackgroundImage,
    safeArea: globalStyleTokens.safeAreaOverlay,
    container: {
      // Renamed from 'modalCard'
      flex: 1,
      flexDirection: 'row',
    },
    leftPanel: {
      width: '35%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    imageUploadContainer: {
      marginBottom: 20,
    },
    imageWrapper: {
      position: 'relative',
    },
    editOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadPlaceholder: {
      width: 180,
      height: 180,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 10,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadText: {
      color: '#fff',
      marginTop: 10,
      fontSize: 14,
      fontWeight: '600',
    },
    leftPanelImage: {
      width: 180,
      height: 180,
      resizeMode: 'contain',
      borderRadius: 10,
    },
    mobileImageContainer: {
      width: '100%',
      marginBottom: 20,
      alignItems: 'center',
    },
    mobileImage: {
      width: 150,
      height: 150,
      resizeMode: 'cover',
      borderRadius: 10,
      backgroundColor: '#f5f5f5',
    },
    mobileUploadPlaceholder: {
      width: 150,
      height: 150,
      backgroundColor: '#f5f5f5',
      borderRadius: 10,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mobileUploadText: {
      color: '#666',
      marginTop: 8,
      fontSize: 13,
      fontWeight: '500',
    },
    leftPanelTitle: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#000000ff',
      textAlign: 'center',
    },
    leftPanelSubtitle: {
      fontSize: 13,
      color: '#000000ff',
      marginTop: 10,
      opacity: 0.8,
      letterSpacing: 1,
    },
    brandName: {
      fontSize: 15,
      color: '#000000ff',
      marginTop: 30,
      opacity: 0.8,
    },
    rightPanel: {
      flex: 1,
      // If mobile, make background solid white for better readability
      backgroundColor:
        Platform.OS !== 'web' ? '#fff' : 'rgba(255, 255, 255, 0.4)',
      padding: 20,
      borderTopLeftRadius: Platform.OS !== 'web' ? 25 : 0, // Rounded corners for mobile
      borderTopRightRadius: Platform.OS !== 'web' ? 25 : 0,
    },
    mobileRightPanel: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000ff' }, // White text
    editBadge: {
      backgroundColor: '#27B2C3',
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    editBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      // backgroundColor: 'rgba(20, 2, 2, 0.7)', // Semi-transparent
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    // Added backButton style to avoid missing property error
    backButton: {
      padding: 6,
      marginRight: 10,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 6,
    },
    userText: {
      marginLeft: 8,
      marginRight: 8,
      fontSize: 14,
      fontWeight: '500',
    },
    formBody: { flexDirection: 'row', gap: 25, flex: 1 },
    formColumn: { flex: 1, width: '100%' },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#000000ff',
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.3)',
      paddingBottom: 5,
    },
    valueText: {
      fontSize: 14,
      color: '#1A202C',
      fontWeight: '500',
    },
    inlinePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inlinePickerText: {
      fontSize: 14,
      color: '#1A202C',
      fontWeight: '500',
      flex: 1,
      marginRight: 8,
    },
    inlinePickerPlaceholder: {
      color: '#6B7280',
    },
    pickerModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    pickerModalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '70%',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
    },
    pickerModalTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      color: '#111827',
    },
    pickerList: {
      maxHeight: 320,
    },
    pickerModalItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    pickerModalItemText: {
      fontSize: 14,
      color: '#1F2937',
    },
    pickerModalCloseBtn: {
      marginTop: 12,
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#E2E8F0',
    },
    pickerModalCloseText: {
      color: '#334155',
      fontWeight: '600',
    },

    barcodeContainer: {
      marginBottom: 5,
    },
    barcodeImage: {
      width: '100%',
      height: 70,
      resizeMode: 'contain',
      backgroundColor: 'rgba(255, 255, 255, 0.9)', // Almost solid white
      padding: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#0f0101ff',
    },
    barcodeUploadPlaceholder: {
      width: '100%',
      height: 70,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    barcodeUploadText: {
      color: '#666',
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 8,
    },
    barcodeText: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: '#000000ff',
    },
    currentUserText: {
      textAlign: 'center',
      fontSize: 13,
      color: '#000000ff',
      marginTop: 5,
      marginBottom: 20,
    },
    purchaseDetails: { flexDirection: 'row' },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.3)',
    },
    saveButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
    },
    cancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: '#EAEAEA',
      marginLeft: 10,
      alignItems: 'center',
    },
    buttonText: { color: '#000000ff', fontSize: 14, fontWeight: 'bold' },
  });
}

export default assetStyles;
