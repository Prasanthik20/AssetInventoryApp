import { StyleSheet, Platform } from 'react-native';
import { globalColors, globalTypography } from '../../styles/globalStyles';

export const billingStyles = (isMobileLayout: boolean) => {
  const theme = {
    page: '#071425',
    panel: 'rgba(7, 24, 42, 0.78)',
    panelStrong: 'rgba(7, 24, 42, 0.9)',
    panelMuted: 'rgba(18, 45, 73, 0.86)',
    border: 'rgba(159, 207, 255, 0.22)',
    textPrimary: '#E6F3FF',
    textSecondary: '#A9C6E4',
    accent: '#34D399',
    brandBlue: '#22D3EE',
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
    container: {
      flex: 1,
      margin: isMobileLayout ? 0 : 20,
      borderRadius: isMobileLayout ? 0 : 20,
      overflow: 'hidden',
      backgroundColor: theme.panel,
      borderWidth: isMobileLayout ? 0 : 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.panelStrong,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      color: theme.textPrimary,
      fontSize: globalTypography.titleLg,
      fontWeight: globalTypography.weightBold,
    },
    scrollContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 15,
    },
    
    // Status Card
    statusCard: {
      backgroundColor: theme.panelMuted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 25,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    statusBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(159, 207, 255, 0.1)',
    },
    statusTextLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statusTextValue: {
      fontSize: 14,
      color: theme.textPrimary,
      fontWeight: '600',
    },

    // Plans Grid
    plansContainer: {
      marginBottom: 25,
    },
    planCard: {
      backgroundColor: theme.panelMuted,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 20,
      marginBottom: 15,
      position: 'relative',
    },
    planCardActive: {
      borderColor: theme.accent,
      backgroundColor: 'rgba(52, 211, 153, 0.05)',
    },
    planCardSelected: {
      borderColor: theme.brandBlue,
      backgroundColor: 'rgba(34, 211, 238, 0.05)',
    },
    activeLabel: {
      position: 'absolute',
      top: 15,
      right: 15,
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    activeLabelText: {
      fontSize: 10,
      color: '#071425',
      fontWeight: 'bold',
    },
    planName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 8,
    },
    planPriceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 15,
    },
    planPrice: {
      fontSize: 26,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    planDuration: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    planLimitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    planLimitText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 8,
    },
    selectPlanBtn: {
      marginTop: 15,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectPlanBtnActive: {
      backgroundColor: 'rgba(52, 211, 153, 0.2)',
      borderColor: theme.accent,
    },
    selectPlanBtnSelected: {
      backgroundColor: theme.brandBlue,
      borderColor: theme.brandBlue,
    },
    selectPlanBtnText: {
      fontWeight: '700',
      fontSize: 14,
      color: theme.textPrimary,
    },
    selectPlanBtnTextSelected: {
      color: '#071425',
    },

    // B2B Payment Form
    paymentFormCard: {
      backgroundColor: theme.panelMuted,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 20,
      marginBottom: 30,
    },
    bankDetailsContainer: {
      backgroundColor: 'rgba(7, 24, 42, 0.6)',
      borderRadius: 10,
      padding: 15,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 20,
    },
    bankTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bankRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    bankLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    bankValue: {
      fontSize: 13,
      color: theme.textPrimary,
      fontWeight: 'bold',
    },
    inputLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 12,
    },
    textInput: {
      backgroundColor: 'rgba(7, 24, 42, 0.6)',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 48,
      color: theme.textPrimary,
      fontSize: 14,
    },
    textAreaInput: {
      backgroundColor: 'rgba(7, 24, 42, 0.6)',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      height: 80,
      color: theme.textPrimary,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(7, 24, 42, 0.6)',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.textSecondary,
      borderRadius: 8,
      paddingVertical: 14,
      marginTop: 5,
    },
    uploadBtnText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '600',
      marginLeft: 8,
    },
    proofPreviewContainer: {
      position: 'relative',
      marginTop: 10,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    proofPreview: {
      width: '100%',
      height: 160,
    },
    removeProofBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 15,
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtn: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#071425',
    },
    loadingText: {
      color: '#A9C6E4',
      marginTop: 10,
      fontSize: 14,
    },
  });
};
