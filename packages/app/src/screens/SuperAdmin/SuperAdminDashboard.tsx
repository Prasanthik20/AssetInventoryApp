import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Picker } from "@react-native-picker/picker";
import { baseURL } from '../../navigation/types';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { StatMetricCard } from '../../components/dashboard/StatMetricCard';

interface Company {
  id: string;
  name: string;
  status: string;
  assetsCount: number;
  planName: string;
  planId?: string;
  organizationType?: string;
  createdAt?: string;
  endDate?: string;
  startDate: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminAddress?: string;
}

interface PlanPackage {
  id: string;
  name: string;
  maxUsers: number;
  maxAssets: number;
  price: number;
  currency: string;
  features?: any;
}

interface PlatformAsset {
  id: string;
  name: string;
  serialNo: string;
  assetId: string;
  status: string;
  location: string;
  tenantName: string;
}

export default function SuperAdminDashboard({ setUser }: any) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeSubscriptions: 0,
    pendingRenewals: 0,
    totalAssetsOnPlatform: 0,
    depreciatingAssetsCount: 0
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [depreciatingAssets, setDepreciatingAssets] = useState<any[]>([]);
  const [isDepreciationModalVisible, setIsDepreciationModalVisible] = useState(false);
  const [plans, setPlans] = useState<PlanPackage[]>([]);

  // Sort states
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Modals & Profile overlay states
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isPlansModalVisible, setIsPlansModalVisible] = useState(false);
  const [isAssetsVisible, setIsAssetsVisible] = useState(false);

  // Platform Assets states
  const [platformAssets, setPlatformAssets] = useState<PlatformAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Tenant Profile Editor fields
  const [profileStatus, setProfileStatus] = useState("active");
  const [profilePlanId, setProfilePlanId] = useState("free-trial");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Plan Package Editor states
  const [editingPlan, setEditingPlan] = useState<PlanPackage | null>(null);
  const [isPlanEditorVisible, setIsPlanEditorVisible] = useState(false);

  // Editor Form Fields
  const [editorId, setEditorId] = useState("");
  const [editorName, setEditorName] = useState("");
  const [editorMaxUsers, setEditorMaxUsers] = useState("5");
  const [editorMaxAssets, setEditorMaxAssets] = useState("100");
  const [editorPrice, setEditorPrice] = useState("0");
  const [editorCurrency, setEditorCurrency] = useState("INR");
  const [editorFeatures, setEditorFeatures] = useState<any>({
    storage: "2GB",
    reports: "basic",
    support: "email",
    qrCode: false,
    apiAccess: false,
    customCategories: false,
    dynamicFields: false,
    auditLogs: false,
  });

  const fetchSuperAdminData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Global Stats
      const statsRes = await axios.get(`${baseURL}/api/superadmin/stats`, { headers });
      setStats(statsRes.data);
      setDepreciatingAssets(statsRes.data.depreciatingAssets || []);

      // 2. Fetch Tenants
      const tenantsRes = await axios.get(`${baseURL}/api/superadmin/tenants`, { headers });
      setCompanies(tenantsRes.data.tenants || []);

      // 3. Fetch Plans
      const plansRes = await axios.get(`${baseURL}/api/superadmin/plans`, { headers });
      setPlans(plansRes.data.plans || []);
    } catch (error) {
      console.error('SuperAdmin Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformAssets = async () => {
    setLoadingAssets(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const queryParams = `tenantId=${selectedTenantFilter}&status=${selectedStatusFilter}`;
      const res = await axios.get(`${baseURL}/api/superadmin/assets?${queryParams}`, { headers });
      setPlatformAssets(res.data.assets || []);
    } catch (e) {
      console.error('Fetch platform assets error:', e);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  useEffect(() => {
    if (isAssetsVisible) {
      fetchPlatformAssets();
    }
  }, [isAssetsVisible, selectedTenantFilter, selectedStatusFilter]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'user',
        'token',
        'accessToken',
        'refreshToken',
      ]);
    } catch (error) {
      console.error('Logout storage cleanup error:', error);
    } finally {
      setUser(null);


      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedCompany) return;
    setUpdatingProfile(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${baseURL}/api/superadmin/tenants`, {
        tenantId: selectedCompany.id,
        status: profileStatus,
        planId: profilePlanId
      }, { headers });

      // Refresh list
      await fetchSuperAdminData();
      setIsDetailsModalVisible(false);
    } catch (e) {
      console.error('Error updating tenant details:', e);
      alert('Failed to save profile updates.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const openPlanEditor = (plan: PlanPackage | null) => {
    if (plan) {
      setEditingPlan(plan);
      setEditorId(plan.id);
      setEditorName(plan.name);
      setEditorMaxUsers(String(plan.maxUsers));
      setEditorMaxAssets(String(plan.maxAssets));
      setEditorPrice(String(plan.price));
      setEditorCurrency(plan.currency || "INR");

      const features = plan.features || {};
      setEditorFeatures({
        storage: features.storage || "2GB",
        reports: features.reports || "basic",
        support: features.support || "email",
        qrCode: !!features.qrCode,
        apiAccess: !!features.apiAccess,
        customCategories: !!features.customCategories,
        dynamicFields: !!features.dynamicFields,
        auditLogs: !!features.auditLogs,
      });
    } else {
      setEditingPlan(null);
      setEditorId("");
      setEditorName("");
      setEditorMaxUsers("10");
      setEditorMaxAssets("500");
      setEditorPrice("999");
      setEditorCurrency("INR");
      setEditorFeatures({
        storage: "5GB",
        reports: "standard",
        support: "email",
        qrCode: true,
        apiAccess: false,
        customCategories: false,
        dynamicFields: false,
        auditLogs: false,
      });
    }
    setIsPlanEditorVisible(true);
  };

  const handleSavePlan = async () => {
    if (!editorId.trim() || !editorName.trim() || !editorPrice.trim()) {
      alert("Please fill all required package details.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${baseURL}/api/superadmin/plans`, {
        id: editorId,
        name: editorName,
        maxUsers: parseInt(editorMaxUsers, 10),
        maxAssets: parseInt(editorMaxAssets, 10),
        price: parseFloat(editorPrice),
        currency: editorCurrency,
        features: editorFeatures
      }, { headers });

      // Refresh catalog data
      await fetchSuperAdminData();
      setIsPlanEditorVisible(false);
    } catch (e) {
      console.error('Error saving plan package:', e);
      alert('Failed to save plans package.');
    }
  };

  const renderCompanyItem = ({ item }: { item: Company }) => {
    let statusText = item.status;
    let statusColor = item.status === 'active' ? '#34D399' : '#EF4444';
    let isWarning = false;

    if (item.endDate) {
      const end = new Date(item.endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        statusText = 'Expired';
        statusColor = '#EF4444';
      } else if (diffDays <= 7) {
        statusText = `Expiring (${diffDays}d)`;
        statusColor = '#F59E0B'; // Warning orange
        isWarning = true;
      }
    }

    return (
      <View style={[styles.tableRow, isMobileLayout && { flexWrap: 'wrap', rowGap: 6, paddingHorizontal: 10 }]}>
        <Text style={[styles.tableCell, styles.companyName]}>{item.name}</Text>
        <Text style={styles.tableCell}>{item.planName}</Text>
        <View style={[styles.tableCell, { flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ textTransform: 'capitalize', fontWeight: 'bold', color: statusColor }}>
            {statusText}
          </Text>
          {isWarning && <Ionicons name="warning" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />}
        </View>
        <Text style={styles.tableCell}>{item.assetsCount}</Text>
        <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedCompany(item);
              setProfileStatus(statusText === 'Expired' ? 'expired' : item.status);
              setProfilePlanId(item.planId || "free-trial");
              setIsDetailsModalVisible(true);
            }}
          >
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#07182a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22D3EE" />
        <Text style={{ color: '#A9C6E4', marginTop: 12 }}>Loading Asset metrics...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/Company-bg.webp")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <DashboardHeader
          companyName="ASQ Platform Control Panel"
          userName="Super Admin"
          userRole="Super Admin"
          onLogout={handleLogout}
        />

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.dashboardContainer, isMobileLayout && { width: '100%', padding: 14, borderRadius: 16 }]}>
            {/* Top Stats Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <StatMetricCard
                title="ORGANIZATIONS"
                count={stats.totalTenants}
                iconName="business-outline"
                accentColor="#22D3EE"
              />
              <StatMetricCard
                title="PAID SUBSCRIPTIONS"
                count={stats.activeSubscriptions}
                iconName="checkmark-done-circle-outline"
                accentColor="#34D399"
              />
              <StatMetricCard
                title="PENDING RENEWALS"
                count={stats.pendingRenewals}
                iconName="time-outline"
                accentColor="#F59E0B"
              />
              <StatMetricCard
                title="PLATFORM ASSETS"
                count={stats.totalAssetsOnPlatform}
                iconName="cube-outline"
                accentColor="#EC4899"
                onPress={() => setIsAssetsVisible(true)}
              />
              <StatMetricCard
                title="DEPRECIATING ASSETS"
                count={(stats as any).depreciatingAssetsCount ?? 0}
                iconName="trending-down-outline"
                accentColor="#EAB308"
                onPress={() => setIsDepreciationModalVisible(true)}
              />
            </View>

            {/* Client Companies Listing */}
            <View style={styles.tableContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Registered Organizations</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18, 45, 73, 0.86)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(159, 207, 255, 0.22)' }}
                  onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  <Text style={{ color: '#A9C6E4', marginRight: 5, fontSize: 12 }}>Sort by Assets</Text>
                  <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={14} color="#A9C6E4" />
                </TouchableOpacity>
              </View>
              {!isMobileLayout && <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'left', paddingLeft: 8 }]}>Client Name</Text>
                <Text style={styles.tableHeaderText}>Active Plan</Text>
                <Text style={styles.tableHeaderText}>Status</Text>
                <Text style={styles.tableHeaderText}>Live Assets</Text>
                <Text style={styles.tableHeaderText}>Action</Text>
              </View>}
              <FlatList
                data={[...companies].sort((a, b) => {
                  if (!sortOrder) return 0;
                  return sortOrder === 'asc' ? a.assetsCount - b.assetsCount : b.assetsCount - a.assetsCount;
                })}
                keyExtractor={(item, index) => item.id + '-' + index}
                renderItem={renderCompanyItem}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={{ color: '#A9C6E4', textAlign: 'center', marginVertical: 20 }}>No companies registered on the platform.</Text>
                }
              />
            </View>

            {/* Quick Action Operations */}
            <View style={[styles.actionsContainer, isMobileLayout && { flexDirection: 'column', gap: 8 }]}>
              <TouchableOpacity style={styles.actionPrimary} onPress={() => navigation.navigate("AddCompany" as never)}>
                <LinearGradient colors={["#0EA5E9", "#0F766E"]} style={styles.gradientButton}>
                  <Text style={styles.actionBtnText}>Add New Organization</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionSecondary} onPress={() => setIsPlansModalVisible(true)}>
                <LinearGradient colors={["#3B82F6", "#1D4ED8"]} style={styles.gradientButton}>
                  <Text style={styles.actionBtnText}>Configure Plan Packages</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* ================= MODAL: ORGANIZATIONAL PROFILE DETAILS OVERLAY ================= */}
        {isDetailsModalVisible && selectedCompany && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🏢 Organization Profile</Text>
                <TouchableOpacity onPress={() => setIsDetailsModalVisible(false)}>
                  <Ionicons name="close-circle-outline" size={26} color="#FF4D4D" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Organization Name</Text>
                  <Text style={styles.modalValue}>{selectedCompany.name}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>System Identifier (Tenant ID)</Text>
                  <Text style={[styles.modalValue, { fontSize: 12, color: '#A9C6E4', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                    {selectedCompany.id}
                  </Text>
                </View>

                {/* Status Select Radio Row */}
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Account Lifecycle Status</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {['active', 'suspended', 'expired'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusSelectBtn,
                          profileStatus === st && {
                            backgroundColor: st === 'active' ? '#10B981' : st === 'suspended' ? '#EF4444' : '#F59E0B',
                            borderColor: 'transparent'
                          }
                        ]}
                        onPress={() => setProfileStatus(st)}
                      >
                        <Text style={[styles.statusSelectText, profileStatus === st && { color: '#fff', fontWeight: 'bold' }]}>
                          {st.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Plan Select Button Row */}
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Subscription Package</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {plans.map((pl) => (
                      <TouchableOpacity
                        key={pl.id}
                        style={[
                          styles.planSelectBtn,
                          profilePlanId === pl.id && { backgroundColor: '#22D3EE', borderColor: 'transparent' }
                        ]}
                        onPress={() => setProfilePlanId(pl.id)}
                      >
                        <Text style={[styles.planSelectText, profilePlanId === pl.id && { color: '#07182a', fontWeight: 'bold' }]}>
                          {pl.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Organization Type</Text>
                  <Text style={styles.modalValue}>{selectedCompany.organizationType || 'Standard Client'}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Live Assets Logged</Text>
                  <Text style={styles.modalValue}>{selectedCompany.assetsCount} Active Assets</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Registered Date</Text>
                  <Text style={styles.modalValue}>
                    {selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                  </Text>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Plan Start Date</Text>
                  <Text style={styles.modalValue}>
                    {selectedCompany.startDate ? new Date(selectedCompany.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Plan End Date</Text>
                  <Text style={styles.modalValue}>
                    {selectedCompany.endDate ? new Date(selectedCompany.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                  </Text>
                </View>

                <Text style={[styles.sectionTitle, { fontSize: 15, marginTop: 10, marginBottom: 10, borderLeftWidth: 0, paddingLeft: 0 }]}>Primary Admin Details</Text>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Admin Name</Text>
                  <Text style={styles.modalValue}>{selectedCompany.adminName || 'N/A'}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Admin Email</Text>
                  <Text style={styles.modalValue}>{selectedCompany.adminEmail || 'N/A'}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Admin Phone</Text>
                  <Text style={styles.modalValue}>{selectedCompany.adminPhone || 'N/A'}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Admin Address</Text>
                  <Text style={styles.modalValue}>{selectedCompany.adminAddress || 'N/A'}</Text>
                </View>

              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { flex: 1, backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }]} onPress={() => setIsDetailsModalVisible(false)}>
                  <Text style={[styles.modalCloseText, { color: '#fff' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { flex: 1 }]} onPress={handleSaveProfile} disabled={updatingProfile}>
                  {updatingProfile ? (
                    <ActivityIndicator size="small" color="#22D3EE" />
                  ) : (
                    <Text style={styles.modalCloseText}>Save Updates</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================= MODAL: PLANS PACKAGES OVERVIEW OVERLAY ================= */}
        {isPlansModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: Platform.OS === 'web' ? '60%' : '92%', maxWidth: 700 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📦 Platform Plan Catalog</Text>
                <TouchableOpacity onPress={() => openPlanEditor(null)} style={styles.addPlanHeaderBtn}>
                  <Ionicons name="add-circle-outline" size={20} color="#34D399" />
                  <Text style={{ color: '#34D399', fontWeight: 'bold', marginLeft: 4 }}>Add Plan</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsPlansModalVisible(false)}>
                  <Ionicons name="close-circle-outline" size={26} color="#FF4D4D" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                {plans.map((plan) => {
                  const features = plan.features || {};
                  return (
                    <View key={plan.id} style={styles.planOverviewCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.planName}>{plan.name}</Text>
                          <TouchableOpacity onPress={() => openPlanEditor(plan)}>
                            <Feather name="edit-2" size={14} color="#22D3EE" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.planPrice}>₹{parseFloat(String(plan.price)).toLocaleString()} /mo</Text>
                      </View>
                      <Text style={styles.planLimits}>
                        Limits: {plan.maxUsers === 999999 ? 'Unlimited' : plan.maxUsers} Users | {plan.maxAssets === 999999 ? 'Unlimited' : plan.maxAssets} Assets | {features.storage || '2GB'} Storage
                      </Text>
                      <Text style={styles.planFeatures}>
                        Support: {features.support || 'email'} | Reports: {features.reports || 'basic'} |
                        QR: {features.qrCode ? 'Yes' : 'No'} | Dynamic Fields: {features.dynamicFields ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 15 }]} onPress={() => setIsPlansModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= MODAL: ADD / EDIT PLAN WORKFLOW FORM OVERLAY ================= */}
        {isPlanEditorVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: Platform.OS === 'web' ? '50%' : '94%', maxWidth: 600 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingPlan ? '✍️ Modify Plan Details' : '➕ Create Custom Package'}</Text>
                <TouchableOpacity onPress={() => setIsPlanEditorVisible(false)}>
                  <Ionicons name="close-circle-outline" size={26} color="#FF4D4D" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>

                <View style={styles.editorRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel}>Plan ID (URL Safe) *</Text>
                    <TextInput
                      style={[styles.formInput, editingPlan && { opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                      value={editorId}
                      onChangeText={setEditorId}
                      placeholder="e.g. starter"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      editable={!editingPlan}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Plan Name *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorName}
                      onChangeText={setEditorName}
                      placeholder="e.g. Starter Plan"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

                <View style={styles.editorRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel}>Max Active Users *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorMaxUsers}
                      onChangeText={setEditorMaxUsers}
                      keyboardType="numeric"
                      placeholder="e.g. 25"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Max Assets Limit *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorMaxAssets}
                      onChangeText={setEditorMaxAssets}
                      keyboardType="numeric"
                      placeholder="e.g. 2500"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

                <View style={styles.editorRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel}>Price (Monthly) *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorPrice}
                      onChangeText={setEditorPrice}
                      keyboardType="numeric"
                      placeholder="e.g. 4999.00"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Currency</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorCurrency}
                      onChangeText={setEditorCurrency}
                      placeholder="INR"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

                <View style={styles.divider} />
                <Text style={[styles.sectionTitle, { fontSize: 15, marginTop: 10, marginBottom: 10 }]}>Feature Toggles & Infrastructure</Text>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>QR Code & Barcodes</Text>
                  <Switch
                    value={editorFeatures.qrCode}
                    onValueChange={(v) => setEditorFeatures((prev: any) => ({ ...prev, qrCode: v }))}
                    trackColor={{ false: '#767577', true: '#22D3EE' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Custom Categories</Text>
                  <Switch
                    value={editorFeatures.customCategories}
                    onValueChange={(v) => setEditorFeatures((prev: any) => ({ ...prev, customCategories: v }))}
                    trackColor={{ false: '#767577', true: '#22D3EE' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Dynamic Metadata Fields (EAV)</Text>
                  <Switch
                    value={editorFeatures.dynamicFields}
                    onValueChange={(v) => setEditorFeatures((prev: any) => ({ ...prev, dynamicFields: v }))}
                    trackColor={{ false: '#767577', true: '#22D3EE' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Audit logs governance</Text>
                  <Switch
                    value={editorFeatures.auditLogs}
                    onValueChange={(v) => setEditorFeatures((prev: any) => ({ ...prev, auditLogs: v }))}
                    trackColor={{ false: '#767577', true: '#22D3EE' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>REST API Developer Access</Text>
                  <Switch
                    value={editorFeatures.apiAccess}
                    onValueChange={(v) => setEditorFeatures((prev: any) => ({ ...prev, apiAccess: v }))}
                    trackColor={{ false: '#767577', true: '#22D3EE' }}
                  />
                </View>

                <View style={styles.editorRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabel}>Storage Cap</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorFeatures.storage}
                      onChangeText={(v) => setEditorFeatures((prev: any) => ({ ...prev, storage: v }))}
                      placeholder="e.g. 25GB"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Support Tier</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editorFeatures.support}
                      onChangeText={(v) => setEditorFeatures((prev: any) => ({ ...prev, support: v }))}
                      placeholder="email / priority / dedicated"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { flex: 1, backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }]} onPress={() => setIsPlanEditorVisible(false)}>
                  <Text style={[styles.modalCloseText, { color: '#fff' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { flex: 1 }]} onPress={handleSavePlan}>
                  <Text style={styles.modalCloseText}>Save Package</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================= MODAL: PLATFORM ASSETS VIEWER OVERLAY ================= */}
        {isAssetsVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: Platform.OS === 'web' ? '80%' : '96%', maxWidth: 1000 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📊 Platform Assets Directory</Text>
                <TouchableOpacity onPress={() => setIsAssetsVisible(false)}>
                  <Ionicons name="close-circle-outline" size={26} color="#FF4D4D" />
                </TouchableOpacity>
              </View>

              {/* Filters Row */}
              <View style={{ flexDirection: isMobileLayout ? 'column' : 'row', gap: 10, marginBottom: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Filter by Organization</Text>
                  <View style={[styles.formInput, { padding: 0, justifyContent: 'center' }]}>
                    <Picker
                      selectedValue={selectedTenantFilter}
                      onValueChange={(itemValue) => setSelectedTenantFilter(itemValue)}
                      style={{ color: '#E6F3FF', width: '100%', backgroundColor: 'rgba(18, 45, 73, 0.95)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(159, 207, 255, 0.22)' }}
                      dropdownIconColor="#E6F3FF"
                    >
                      <Picker.Item label="All Organizations" value="all" />
                      {companies.map(c => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Filter by Status</Text>
                  <View style={[styles.formInput, { padding: 0, justifyContent: 'center' }]}>
                    <Picker

                      selectedValue={selectedStatusFilter}
                      onValueChange={(itemValue) => setSelectedStatusFilter(itemValue)}
                      style={{ color: '#E6F3FF', width: '100%', backgroundColor: 'rgba(18, 45, 73, 0.95)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(159, 207, 255, 0.22)' }}
                      dropdownIconColor="#E6F3FF"
                    >
                      <Picker.Item label="All Statuses" value="all" />
                      <Picker.Item label="Unassigned" value="unassigned" />
                      <Picker.Item label="Assigned" value="assigned" />
                      <Picker.Item label="Returned" value="overdue" />
                      <Picker.Item label="Maintenance" value="maintenance" />
                      {/* <Picker.Item label="Damaged" value="damaged" /> */}
                      {/* <Picker.Item label="Retired" value="retired" /> */}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.tableContainer}>
                {!isMobileLayout && <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2, paddingLeft: 8 }]}>Asset Name / Serial</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Organization</Text>
                  <Text style={styles.tableHeaderText}>Status</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Location</Text>
                </View>}
                <ScrollView style={{ maxHeight: 600 }} showsVerticalScrollIndicator={true}>
                  {loadingAssets ? (
                    <ActivityIndicator size="large" color="#22D3EE" style={{ marginVertical: 30 }} />
                  ) : platformAssets.length === 0 ? (
                    <Text style={{ color: '#A9C6E4', textAlign: 'center', marginVertical: 30 }}>No assets found matching these filters.</Text>
                  ) : (
                    platformAssets.map((asset, index) => (
                      <View key={asset.id + '-' + index} style={[styles.tableRow, isMobileLayout && { flexWrap: 'wrap', rowGap: 6, paddingHorizontal: 10 }]}>
                        <View style={{ flex: 2, paddingLeft: 8 }}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{asset.name}</Text>
                          <Text style={{ color: '#A9C6E4', fontSize: 11 }}>{asset.serialNo}</Text>
                        </View>
                        <Text style={[styles.tableCell, { flex: 1.5, color: '#A9C6E4' }]}>{asset.tenantName}</Text>
                        <Text style={[styles.tableCell, { textTransform: 'capitalize', fontWeight: 'bold', color: asset.status === 'assigned' ? '#34D399' : asset.status === 'unassigned' ? '#22D3EE' : '#F59E0B' }]}>
                          {asset.status}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1.5, color: '#A9C6E4' }]} numberOfLines={1}>
                          {asset.location || 'N/A'}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 15 }]} onPress={() => setIsAssetsVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* DEPRECIATION DETAILS TABLE MODAL FOR SUPER ADMIN */}
        <Modal
          visible={isDepreciationModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsDepreciationModalVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <View style={{
              width: isDesktopWeb ? '85%' : '100%',
              maxHeight: '85%',
              backgroundColor: '#07182a',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(159, 207, 255, 0.22)',
              padding: 24,
              overflow: 'hidden'
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(159, 207, 255, 0.12)',
                paddingBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="trending-down" size={24} color="#EAB308" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#E6F3FF' }}>
                    Platform Depreciating Assets (lessthan 60% Life Remaining)
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsDepreciationModalVisible(false)}>
                  <Ionicons name="close-circle-outline" size={26} color="#FF4D4D" />
                </TouchableOpacity>
              </View>

              {depreciatingAssets.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#A9C6E4', fontSize: 15 }}>No assets are currently depreciating under 60% life across the platform.</Text>
                </View>
              ) : (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 750 }}>
                    {/* Table Header */}
                    <View style={{
                      flexDirection: 'row',
                      backgroundColor: 'rgba(18, 45, 73, 0.86)',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(159, 207, 255, 0.22)',
                      marginBottom: 6
                    }}>
                      <Text style={{ flex: 1.5, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Organization</Text>
                      <Text style={{ flex: 2, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Asset Name</Text>
                      <Text style={{ flex: 1.5, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Serial #</Text>
                      <Text style={{ flex: 1, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Purchase Price</Text>
                      <Text style={{ flex: 1.2, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Remaining Life</Text>
                      <Text style={{ flex: 1.2, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Book Value</Text>
                      <Text style={{ flex: 1.5, color: '#E6F3FF', fontWeight: 'bold', fontSize: 13 }}>Action Required</Text>
                    </View>

                    {/* Table Body */}
                    <ScrollView style={{ maxHeight: 450 }}>
                      {depreciatingAssets.map((item, index) => (
                        <View key={item.id || index} style={{
                          flexDirection: 'row',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderBottomWidth: 1,
                          borderColor: 'rgba(159, 207, 255, 0.12)',
                          alignItems: 'center',
                          backgroundColor: 'rgba(7, 24, 42, 0.92)'
                        }}>
                          <Text style={{ flex: 1.5, color: '#E6F3FF', fontSize: 13, fontWeight: 'bold' }} numberOfLines={1}>{item.tenantName}</Text>
                          <Text style={{ flex: 2, color: '#A9C6E4', fontSize: 13 }} numberOfLines={1}>{item.name}</Text>
                          <Text style={{ flex: 1.5, color: '#A9C6E4', fontSize: 13 }} numberOfLines={1}>{item.serialNo || 'N/A'}</Text>
                          <Text style={{ flex: 1, color: '#A9C6E4', fontSize: 13 }}>₹{parseFloat(item.price || 0).toLocaleString('en-IN')}</Text>
                          <Text style={{ flex: 1.2, color: item.percentLifeRemaining < 20 ? '#EF4444' : '#F59E0B', fontSize: 13, fontWeight: 'bold' }}>
                            {item.percentLifeRemaining}%
                          </Text>
                          <Text style={{ flex: 1.2, color: '#34D399', fontSize: 13, fontWeight: '600' }}>
                            ₹{item.remainingValue.toLocaleString('en-IN')}
                          </Text>
                          <View style={{ flex: 1.5 }}>
                            <View style={{
                              backgroundColor: item.percentLifeRemaining < 20 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              borderColor: item.percentLifeRemaining < 20 ? '#EF4444' : '#3B82F6',
                              borderWidth: 1,
                              borderRadius: 4,
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                              alignSelf: 'flex-start'
                            }}>
                              <Text style={{
                                color: item.percentLifeRemaining < 20 ? '#FCA5A5' : '#93C5FD',
                                fontSize: 11,
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}>
                                {item.percentLifeRemaining < 20 ? 'SEND TO SCRAP' : 'UPGRADE ASSET'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              )}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsDepreciationModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    // paddingVertical: 20,
    // paddingHorizontal: 12,
  },
  dashboardContainer: {
    width: "100%",
    backgroundColor: "rgba(7, 24, 42, 0.88)",
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    shadowColor: "#001325",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  headerTitle: {
    color: "#E6F3FF",
    fontSize: 22,
    fontWeight: "700",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  adminText: {
    color: "#A9C6E4",
    marginLeft: 5,
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: "rgba(255, 77, 77, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 77, 0.3)",
    padding: 8,
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statCard: {
    flexBasis: "24%",
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 15,
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
  },
  statNumber: {
    color: "#E6F3FF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 5,
  },
  statLabel: {
    color: "#A9C6E4",
    fontSize: 13,
    marginTop: 3,
    textAlign: "center",
  },
  tableContainer: {
    marginVertical: 25,
  },
  sectionTitle: {
    color: "#22D3EE",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#22D3EE',
    paddingLeft: 10,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  tableHeaderText: {
    flex: 1,
    color: "#E6F3FF",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "left",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    backgroundColor: "rgba(7, 24, 42, 0.92)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.12)',
    paddingVertical: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  tableCell: {
    flex: 1,
    color: "#A9C6E4",
    textAlign: "left",
    fontSize: 13,
  },
  companyName: {
    flex: 2,
    textAlign: "left",
    paddingLeft: 8,
    color: '#E6F3FF',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  actionText: {
    color: "#22D3EE",
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 20,
  },
  actionPrimary: {
    flex: 1,
    marginHorizontal: 5,
  },
  actionSecondary: {
    flex: 1,
    marginHorizontal: 5,
  },
  gradientButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#07182a',
    borderRadius: 20,
    padding: 24,
    width: Platform.OS === 'web' ? '40%' : '92%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(159, 207, 255, 0.12)',
    paddingBottom: 12,
  },
  modalTitle: {
    color: '#E6F3FF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    color: '#A9C6E4',
    fontSize: 12,
    marginBottom: 4,
  },
  modalValue: {
    color: '#E6F3FF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: '#22D3EE',
    fontWeight: 'bold',
    fontSize: 14,
  },
  planOverviewCard: {
    backgroundColor: 'rgba(18, 45, 73, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  planName: {
    color: '#22D3EE',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planPrice: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: 'bold',
  },
  planLimits: {
    color: '#E6F3FF',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  planFeatures: {
    color: '#A9C6E4',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  addPlanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 'auto',
    marginRight: 10,
  },
  editorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  formLabel: {
    color: '#A9C6E4',
    fontSize: 12,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(159,207,255,0.22)',
    padding: 12,
    color: '#fff',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(18,45,73,0.5)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(159,207,255,0.08)',
  },
  switchLabel: {
    color: '#E6F3FF',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(159,207,255,0.12)',
    marginVertical: 10,
  },
  statusSelectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusSelectText: {
    color: '#A9C6E4',
    fontSize: 11,
    fontWeight: '500',
  },
  planSelectBtn: {
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  planSelectText: {
    color: '#A9C6E4',
    fontSize: 12,
    fontWeight: '500',
  },
});
