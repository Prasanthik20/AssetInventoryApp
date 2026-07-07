import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { baseURL, RootStackParamList } from '../../navigation/types';
import { billingStyles } from './billing.styles';
import AppSnackbar from '../../components/common/AppSnackbar';

type BillingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Billing'
>;

const BillingScreen: React.FC = () => {
  const navigation = useNavigation<BillingScreenNavigationProp>();
  const isMobileLayout = Platform.OS !== 'web';
  const styles = billingStyles(isMobileLayout);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    kind: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', kind: 'info' });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    setSnackbar({ visible: true, message, kind });
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };
    loadUser();

    return () => {
      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    };
  }, []);

  const getAssetRangeText = (plan: any) => {
    const min = plan.min_assets !== null && plan.min_assets !== undefined ? plan.min_assets : 1;
    const max = plan.maxAssets !== null && plan.maxAssets !== undefined ? plan.maxAssets : plan.max_assets || 999999;
    if (max >= 999999) return `Supports ${min.toLocaleString('en-IN')}+ assets`;
    return `Supports ${min.toLocaleString('en-IN')} - ${max.toLocaleString('en-IN')} assets`;
  };

  const getUserRangeText = (plan: any) => {
    const min = plan.min_users !== null && plan.min_users !== undefined ? plan.min_users : 1;
    const max = plan.maxUsers !== null && plan.maxUsers !== undefined ? plan.maxUsers : plan.max_users || 999999;
    if (max >= 999999) return `Supports ${min.toLocaleString('en-IN')}+ users`;
    return `Supports ${min.toLocaleString('en-IN')} - ${max.toLocaleString('en-IN')} users`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Subscription status
      const statusRes = await axios.get(`${baseURL}/api/subscription/status`);
      const subData = statusRes.data.subscription || null;
      setSubscription(subData);

      if (subData) {
        setSelectedPlanId(subData.planId || 'free-trial');
      }

      // 2. Fetch all Plans
      const plansRes = await axios.get(`${baseURL}/api/superadmin/plans`);
      setPlans(plansRes.data.plans || []);
    } catch (err: any) {
      console.error('Billing Fetch Error:', err);
      showSnackbar('Failed to load subscription details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showSnackbar('Gallery permission is required to upload receipt.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) return;

      if (result.assets && result.assets[0]) {
        const base64Data = result.assets[0].base64;
        if (base64Data) {
          setReceiptPhoto(`data:image/jpeg;base64,${base64Data}`);
          showSnackbar('Receipt screenshot attached!', 'success');
        } else {
          showSnackbar('Failed to read image data.', 'error');
        }
      }
    } catch (err) {
      console.error('Image Picker Error:', err);
      showSnackbar('Failed to select receipt image.', 'error');
    }
  };

  const handleUploadReceipt = () => {
    if (Platform.OS === 'web') {
      pickImage();
    } else {
      Alert.alert(
        'Upload Transfer Receipt',
        'Choose receipt screenshot from Gallery',
        [
          { text: 'Open Gallery', onPress: pickImage },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleSubmitRenewal = async () => {
    if (!selectedPlanId) {
      showSnackbar('Please select a pricing plan.', 'error');
      return;
    }

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    const isEnterprise = selectedPlan && parseFloat(selectedPlan.price) === -1.00;
    const cleanTxId = transactionId.trim();

    if (!isEnterprise && !cleanTxId) {
      showSnackbar('Please enter the bank transfer transaction/reference ID.', 'error');
      return;
    }
    if (!isEnterprise && !receiptPhoto) {
      showSnackbar('Please upload a screenshot of the payment receipt/proof.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(`${baseURL}/api/subscription/renew`, {
        planId: selectedPlanId,
        transactionId: isEnterprise ? undefined : cleanTxId,
        paymentProofUrl: isEnterprise ? undefined : receiptPhoto,
        remarks: remarks.trim() || undefined,
      });

      if (response.data.success) {
        showSnackbar(
          isEnterprise
            ? 'Enterprise setup request submitted! An account manager will contact you.'
            : 'Renewal request submitted! Awaiting review.',
          'success'
        );
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Submit Renewal Error:', err.response?.data || err);
      const errMsg = err.response?.data?.message || 'Failed to submit renewal request.';
      showSnackbar(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status?: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return { bg: 'rgba(52, 211, 153, 0.15)', text: '#34D399', border: '#34D399' };
    if (s === 'trialing') return { bg: 'rgba(34, 211, 238, 0.15)', text: '#22D3EE', border: '#22D3EE' };
    return { bg: 'rgba(249, 115, 115, 0.15)', text: '#F97373', border: '#F97373' };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22D3EE" />
        <Text style={styles.loadingText}>Loading billing details...</Text>
      </View>
    );
  }

  const statusStyle = getStatusColor(subscription?.status);

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={10}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#E6F3FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Subscription & Billing</Text>
            <View style={{ width: 34 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* CURRENT SUBSCRIPTION CARD */}
            <Text style={styles.sectionTitle}>Current Plan</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>Account Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusStyle.bg,
                      borderColor: statusStyle.border,
                    },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                    {String(subscription?.status || 'Expired').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusTextLabel}>Plan Name</Text>
                <Text style={styles.statusTextValue}>{subscription?.planName || 'No active plan'}</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusTextLabel}>Valid Until</Text>
                <Text style={styles.statusTextValue}>{formatDate(subscription?.endDate)}</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusTextLabel}>Max Assets Limit</Text>
                <Text style={styles.statusTextValue}>{subscription?.maxAssets || 0} Assets</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusTextLabel}>Max Team Users</Text>
                <Text style={styles.statusTextValue}>{subscription?.maxUsers || 0} Users</Text>
              </View>
            </View>

            {/* PLANS SELECTION */}
            <Text style={styles.sectionTitle}>Select Plan to Renew / Upgrade</Text>
            <View style={styles.plansContainer}>
              {plans
                .filter(plan => plan.id !== 'enterprise-demo' || user?.roleName === 'Super Admin' || user?.role === 'Super Admin')
                .map((plan) => {
                  const isActive = subscription?.planId === plan.id;
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        isActive && styles.planCardActive,
                        isSelected && !isActive && styles.planCardSelected,
                      ]}
                      onPress={() => setSelectedPlanId(plan.id)}
                      activeOpacity={0.9}
                    >
                      {isActive && (
                        <View style={styles.activeLabel}>
                          <Text style={styles.activeLabelText}>CURRENT</Text>
                        </View>
                      )}
                      <Text style={styles.planName}>{plan.name}</Text>
                      <View style={styles.planPriceContainer}>
                        {parseFloat(plan.price) === -1.00 ? (
                          <Text style={styles.planPrice}>Custom Pricing</Text>
                        ) : (
                          <>
                            <Text style={styles.planPrice}>
                              ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.planDuration}>/ year</Text>
                          </>
                        )}
                      </View>

                      <View style={styles.planLimitRow}>
                        <Feather name="layers" size={16} color="#22D3EE" />
                        <Text style={styles.planLimitText}>
                          {getAssetRangeText(plan)}
                        </Text>
                      </View>
                      <View style={styles.planLimitRow}>
                        <Feather name="users" size={16} color="#22D3EE" />
                        <Text style={styles.planLimitText}>
                          {getUserRangeText(plan)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.selectPlanBtn,
                          isActive && styles.selectPlanBtnActive,
                          isSelected && !isActive && styles.selectPlanBtnSelected,
                        ]}
                        onPress={() => setSelectedPlanId(plan.id)}
                      >
                        <Text
                          style={[
                            styles.selectPlanBtnText,
                            isSelected && !isActive && styles.selectPlanBtnTextSelected,
                          ]}
                        >
                          {isActive ? 'Current Plan' : isSelected ? 'Plan Selected' : 'Choose Plan'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
            </View>            {/* OFFLINE TRANSFER BILLING FORM */}
            {selectedPlanId && (() => {
              const selectedPlan = plans.find(p => p.id === selectedPlanId);
              const isEnterprise = selectedPlan && parseFloat(selectedPlan.price) === -1.00;

              return (
                <View style={styles.paymentFormCard}>
                  {isEnterprise ? (
                    <View style={{ marginBottom: 15, padding: 14, backgroundColor: 'rgba(34, 211, 238, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: '#22D3EE' }}>
                      <Text style={{ color: '#E6F3FF', fontSize: 13, lineHeight: 20 }}>
                        📢 <Text style={{ fontWeight: 'bold', color: '#22D3EE' }}>Enterprise custom configuration request:</Text>
                        {"\n\n"}
                        Submit this request to notify the ASQ system administrators. An account manager will reach out to your team shortly to finalize custom limits, contract pricing, and activation.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 8 }]}>
                        Offline Bank Transfer Details
                      </Text>
                      <Text style={[styles.statusTextLabel, { marginBottom: 15 }]}>
                        Please initiate a bank transfer for the selected plan value, then submit payment proof below:
                      </Text>

                      <View style={styles.bankDetailsContainer}>
                        <Text style={styles.bankTitle}>A Square Technologies Bank Account Info</Text>
                        <View style={styles.bankRow}>
                          <Text style={styles.bankLabel}>Beneficiary Name:</Text>
                          <Text style={styles.bankValue}>A Square Technologies</Text>
                        </View>
                        <View style={styles.bankRow}>
                          <Text style={styles.bankLabel}>Account Number:</Text>
                          <Text style={styles.bankValue}>50200102448772</Text>
                        </View>
                        <View style={styles.bankRow}>
                          <Text style={styles.bankLabel}>IFSC Code:</Text>
                          <Text style={styles.bankValue}>HDFC0001456</Text>
                        </View>
                        <View style={styles.bankRow}>
                          <Text style={styles.bankLabel}>Branch:</Text>
                          <Text style={styles.bankValue}>Eluru Road Branch, Vijayawada</Text>
                        </View>

                        <View style={styles.bankRow}>
                          <Text style={styles.bankLabel}>Account Type:</Text>
                          <Text style={styles.bankValue}>Current Account</Text>
                        </View>
                        <View style={styles.bankRow}>
                          <Text style={styles.bankLabel}>Bank Name:</Text>
                          <Text style={styles.bankValue}>HDFC Bank Ltd</Text>
                        </View>
                      </View>

                      <Text style={styles.inputLabel}>Bank Transfer Transaction Reference ID *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. TXN98721309871"
                        placeholderTextColor="#7FA2C8"
                        value={transactionId}
                        onChangeText={setTransactionId}
                      />

                      <Text style={styles.inputLabel}>Upload Transfer Receipt Screenshot *</Text>
                      {!receiptPhoto ? (
                        <TouchableOpacity
                          style={styles.uploadBtn}
                          onPress={handleUploadReceipt}
                          activeOpacity={0.8}
                        >
                          <Feather name="image" size={20} color="#A9C6E4" />
                          <Text style={styles.uploadBtnText}>Select Receipt Image</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.proofPreviewContainer}>
                          <Image
                            source={{ uri: receiptPhoto }}
                            style={styles.proofPreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeProofBtn}
                            onPress={() => setReceiptPhoto(null)}
                          >
                            <Ionicons name="close" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}

                  <Text style={styles.inputLabel}>Remarks / Notes (Optional)</Text>
                  <TextInput
                    style={styles.textAreaInput}
                    placeholder="Enter remarks, team details, or custom requirements..."
                    placeholderTextColor="#7FA2C8"
                    multiline
                    value={remarks}
                    onChangeText={setRemarks}
                  />

                  <TouchableOpacity
                    onPress={handleSubmitRenewal}
                    disabled={submitting}
                  >
                    <LinearGradient
                      colors={submitting ? ['#475569', '#334155'] : ['#22D3EE', '#0EA5E9']}
                      style={styles.submitBtn}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          {isEnterprise ? 'Request Enterprise Setup' : 'Submit Renewal Request'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </ScrollView>
        </View>

        <AppSnackbar
          visible={snackbar.visible}
          message={snackbar.message}
          kind={snackbar.kind}
          onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

export default BillingScreen;
