import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
// --- For Type Safety with React Navigation ---
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { baseURL, RootStackParamList } from '../../navigation/types';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dashboardStyles } from './dashboard.styles';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { SubscriptionLimitBar } from '../../components/dashboard/SubscriptionLimitBar';
import { StatMetricCard } from '../../components/dashboard/StatMetricCard';
import { AssetDistributionWidget } from '../../components/dashboard/AssetDistributionWidget';
import { AssetHealthWidget } from '../../components/dashboard/AssetHealthWidget';
import { ActivityFeedWidget } from '../../components/dashboard/ActivityFeedWidget';
import { QuickActionsPanel } from '../../components/dashboard/QuickActionsPanel';
import { OfficeFieldWidget } from '../../components/dashboard/OfficeFieldWidget';

interface LocationStat {
  location: string;
  count: number;
}

const SafeFeatherIcon = ({
  name,
  size,
  color,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  size: number;
  color: string;
}) => {
  try {
    return <Feather name={name} size={size} color={color} />;
  } catch {
    return <View style={{ width: size, height: size, backgroundColor: color, opacity: 0.2 }} />;
  }
};

const SafeIonicons = ({
  name,
  size,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size: number;
  color: string;
}) => {
  try {
    return <Ionicons name={name} size={size} color={color} />;
  } catch {
    return <View style={{ width: size, height: size, backgroundColor: color, opacity: 0.2 }} />;
  }
};

const isReturnPendingNotification = (
  reason?: string | null,
  reply?: string | null,
  status?: string | null,
): boolean => {
  const reasonText = String(reason || '').toLowerCase();
  const replyText = String(reply || '').toLowerCase();
  const statusText = String(status || '').toLowerCase();

  const isPendingStatus = statusText === 'unread' || statusText === 'replied';
  const isPendingText =
    reasonText.includes('has been returned by') || replyText.includes('pending confirmation');
  const isAlreadyConfirmed =
    statusText === 'resolved' ||
    statusText === 'received' ||
    reasonText.includes('return confirmed') ||
    replyText.includes('return confirmed');

  return isPendingStatus && isPendingText && !isAlreadyConfirmed;
};

const parseNotificationMessage = (rawReply?: string | null, rawReason?: string | null): string => {
  const preferred = String(rawReply || rawReason || '').trim();
  if (!preferred) return '-';

  try {
    const parsed = JSON.parse(preferred);
    if (parsed && typeof parsed === 'object') {
      if (typeof (parsed as { message?: unknown }).message === 'string') {
        const msg = String((parsed as { message?: string }).message).trim();
        if (msg.length > 0) return msg;
      }
      if (typeof (parsed as { reason?: unknown }).reason === 'string') {
        const reason = String((parsed as { reason?: string }).reason).trim();
        if (reason.length > 0) return reason;
      }
    }
    if (typeof parsed === 'string' && parsed.trim().length > 0) {
      return parsed.trim();
    }
  } catch {
    // Keep plain non-JSON messages unchanged.
  }

  return preferred;
};

// 2. Create a specific type for this screen's navigation prop
type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDashboard'> & {
  setUser: React.Dispatch<React.SetStateAction<any>>;
};
const CompanyDashboard: React.FC<Props> = ({
  navigation,
  route,
  setUser: setAppUser,
}) => {
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const styles = useMemo(
    () => dashboardStyles({ width, height }),
    [width, height],
  );
  // 3. Use the strongly-typed navigation hook
  const [users, setUsers] = useState<any[]>([]);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [officeAssets, setOfficeAssets] = useState<number | null>(null);
  const [fieldAssets, setFieldAssets] = useState<number | null>(null);
  const [unassignedAssets, setUnassignedAssets] = useState<number>(0);
  const [assignedAssets, setAssignedAssets] = useState<number>(0);
  const [overdueAssets, setOverdueAssets] = useState<number>(0);
  const [underMaintenanceAssets, setUnderMaintenanceAssets] =
    useState<number>(0);
  const [fieldLocationStats, setFieldLocationStats] = useState<LocationStat[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [depreciatingAssetsCount, setDepreciatingAssetsCount] = useState<number>(0);
  const [depreciatingAssets, setDepreciatingAssets] = useState<any[]>([]);
  const [isDepreciationModalVisible, setIsDepreciationModalVisible] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [totalCategories, setTotalCategories] = useState<number>(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/auth/users`);
      const data = response.data;

      if (Array.isArray(data.users)) {
        setUsers(data.users);
        setTotalUsers(data.count);
      } else {
        setUsers([]);
        console.error('Users API format error:', data);
      }
    } catch (error) {
      console.error('Users API Error:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!user?.employeeId) return;

    const fetchData = async () => {
      await fetchGlobalNotifications();
    };

    fetchData();
  }, [user?.employeeId]);

  // ------------------------------------
  // 📌 FETCH DASHBOARD METRICS FROM API
  // ------------------------------------
  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/dashboard`);
      const data = response.data;

      setTotalAssets(data.totalAssets);
      setTotalUsers(data.totalUsers);
      setOfficeAssets(data.officeAssets);
      setFieldAssets(data.fieldAssets);
      setUnassignedAssets(data.unassignedAssets);
      setAssignedAssets(data.assignedAssets);
      setOverdueAssets(data.overdueAssets);
      setUnderMaintenanceAssets(data.underMaintenanceAssets);
      setFieldLocationStats(data.fieldLocationStats || []);
      setTotalCategories(data.totalCategories || 0);
      setDepreciatingAssetsCount(data.depreciatingAssetsCount || 0);
      setDepreciatingAssets(data.depreciatingAssets || []);

      const sub = data.subscription || null;
      setSubscription(sub);

      if (sub && sub.endDate) {
        const endDate = new Date(sub.endDate);
        endDate.setHours(23, 59, 59, 999);
        const isExpired = new Date() > endDate;
        setIsSubscriptionExpired(isExpired);
        AsyncStorage.setItem('isSubscriptionExpired', JSON.stringify(isExpired));
      } else {
        setIsSubscriptionExpired(false);
        AsyncStorage.setItem('isSubscriptionExpired', JSON.stringify(false));
      }

    } catch (error: any) {
      console.log('Dashboard API Error:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

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
      setAppUser(null);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
    }
  };

  const fetchGlobalNotifications = async () => {
    const targetId = user?.employeeId || user?.id || user?.userId;
    if (!targetId) return;
    try {
      const response = await axios.get(`${baseURL}/api/notifications/admin`, {
        params: { id: targetId }
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Axios notification error:', error);
    }
  };

  const handleExtendDate = async (notificationId: number, days: number = 5) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${baseURL}/api/assets/extend-return-date`,
        {
          notificationId: Number(notificationId),
          daysToExtend: days,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setNotifications((prev) => prev.filter((n) => Number(n.id) !== Number(notificationId)));
      fetchDashboardData();
      fetchGlobalNotifications();
    } catch (err: any) {
      console.error('Extend Return Date Error:', err?.response?.data || err);
    }
  };


  const hideNotification = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${baseURL}/api/notifications/hide`,
        { id },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setNotifications(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmReturn = async (item: any) => {
    const assignmentId = Number(item?.assignmentId);
    const hasAssignmentId = Number.isFinite(assignmentId) && assignmentId > 0;
    const assetId = Number(item?.asset?.id);
    const notificationId = Number(item?.id);
    const confirmedByEmployeeId = Number(user?.employeeId);

    if (
      !Number.isFinite(notificationId) ||
      !Number.isFinite(confirmedByEmployeeId) ||
      (!hasAssignmentId && !Number.isFinite(assetId))
    ) {
      console.error('Missing return confirmation context:', {
        assignmentId,
        assetId,
        notificationId,
        confirmedByEmployeeId,
      });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${baseURL}/api/assets/confirm-return`,
        {
          notificationId,
          ...(hasAssignmentId ? { assignmentId } : { assetId }),
          confirmedByEmployeeId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await fetchGlobalNotifications();
      await fetchDashboardData();
    } catch (error) {
      console.error('Admin confirm return error:', error);
    }
  };

  const handleWorkflowAction = async (item: any, action: 'approve' | 'reject') => {
    try {
      const parsed = JSON.parse(item.reply || '{}');
      const requestId = Number(parsed.requestId);
      const token = await AsyncStorage.getItem('token');

      await axios.post(
        `${baseURL}/api/approvals/action`,
        {
          requestId,
          action,
          notes: action === 'approve' ? 'Approved via Admin Dashboard' : 'Rejected via Admin Dashboard'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      await fetchGlobalNotifications();
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Admin workflow action error:', error?.response?.data || error);
    }
  };

  const toggleGroup = (senderName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(senderName)) {
        newSet.delete(senderName);
      } else {
        newSet.add(senderName);
      }
      return newSet;
    });
  };

  // -------------------------
  // 📌 RUN ON PAGE OPEN
  // -------------------------
  useFocusEffect(
    useCallback(() => {
      fetchUsers();
      fetchDashboardData();
      fetchGlobalNotifications();
    }, []),
  );

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <DashboardHeader
          companyName={user?.companyName || user?.fullName || 'ASQ - Asset Management'}
          userName={user?.fullName || 'Admin'}
          userRole="Tenant Admin"
          onLogout={handleLogout}
          activities={notifications.map((n) => ({
            id: n.id,
            title: n.reason || 'Notification',
            subtitle: n.reply || undefined,
            time: n.created_at ? new Date(n.created_at).toLocaleTimeString() : undefined,
            rawItem: n,
          }))}
          onConfirmReturn={handleConfirmReturn}
          onWorkflowAction={handleWorkflowAction}
          onHideNotification={hideNotification}
          onExtendDate={handleExtendDate}
        />
        <View style={styles.container}>
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.rightPanel,
                isMobileLayout && styles.mobilePadding,
              ]}
            >
              {/* Expired Subscription Banner */}
              {isSubscriptionExpired && (
                <View style={{ backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1, padding: 14, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#B91C1C', fontWeight: 'bold', fontSize: 14 }}>
                    Your subscription has expired. You have view-only access.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Billing')}
                    style={{
                      marginTop: 10,
                      backgroundColor: '#B91C1C',
                      borderRadius: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
                      Renew / Upgrade Now
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 1. Subscription & Limit Bar */}
              <SubscriptionLimitBar
                planName={subscription?.planName || subscription?.plan || 'Free Trial Plan'}
                status={subscription?.status || 'ACTIVE'}
                renewDate={subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : '13/06/2026'}
                usedUsers={totalUsers || 0}
                maxUsers={subscription?.maxUsers || 5}
                usedAssets={totalAssets || 0}
                maxAssets={subscription?.maxAssets || 100}
              />

              {/* 2. Top Metrics Grid (4 Stat Cards + Quick Action Card) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <StatMetricCard
                    title="TOTAL ASSETS"
                    count={totalAssets ?? 0}
                    iconName="hardware-chip-outline"
                    accentColor="#22D3EE"
                    onPress={() => navigation.navigate('TotalAssetDetails')}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <StatMetricCard
                    title="DEPRECIATING ASSETS"
                    count={depreciatingAssetsCount ?? 0}
                    iconName="trending-down-outline"
                    accentColor="#EAB308"
                    onPress={() => setIsDepreciationModalVisible(true)}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <StatMetricCard
                    title="TOTAL USERS"
                    count={totalUsers ?? 0}
                    iconName="people-outline"
                    accentColor="#38BDF8"
                    onPress={() => navigation.navigate('CompanyUsersScreen')}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <StatMetricCard
                    title="TOTAL CATEGORIES"
                    count={totalCategories ?? 0}
                    iconName="folder-open-outline"
                    accentColor="#8B5CF6"
                    onPress={() => navigation.navigate('CustomCategoryBuilder')}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <QuickActionsPanel
                    title="QUICK ACTIONS"
                    actions={[
                      {
                        id: 'add_asset',
                        label: '+ Add New Asset',
                        iconName: 'add-circle-outline',
                        variant: 'primary',
                        onPress: () => navigation.navigate('AddEditAsset'),
                      },
                    ]}
                  />
                </View>
              </View>

              {/* 3. Middle Row (Distribution, Office/Field, Health & Quick Actions) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <AssetDistributionWidget
                    assignedCount={assignedAssets}
                    unassignedCount={unassignedAssets}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <OfficeFieldWidget
                    officeCount={officeAssets || 0}
                    fieldCount={fieldAssets || 0}
                    onOfficePress={() => navigation.navigate('OfficeAssets')}
                    onFieldPress={() => navigation.navigate('FieldAssets')}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <AssetHealthWidget
                    overdueCount={overdueAssets}
                    maintenanceCount={underMaintenanceAssets}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <QuickActionsPanel
                    title="QUICK ACTIONS"
                    actions={[
                      {
                        id: 'assign_asset',
                        label: 'Assign Asset',
                        iconName: 'link-outline',
                        variant: 'secondary',
                        onPress: () => navigation.navigate('AssignAsset', {
                          supervisor_employeeId: String(user?.employeeId || ''),
                          supervisorName: user?.fullName || '',
                        }),
                      },
                      {
                        id: 'add_user',
                        label: 'Add New User',
                        iconName: 'person-add-outline',
                        variant: 'secondary',
                        onPress: () => navigation.navigate('AddCompanyUser'),
                      },
                      {
                        id: 'manage_roles',
                        label: 'Manage Roles',
                        iconName: 'shield-checkmark-outline',
                        variant: 'secondary',
                        onPress: () => navigation.navigate('ManageRoles'),
                      },
                      {
                        id: 'workflows',
                        label: 'Approval Workflows',
                        iconName: 'git-network-outline',
                        variant: 'secondary',
                        onPress: () => navigation.navigate('ConfigureWorkflows'),
                      },
                      {
                        id: 'billing',
                        label: 'Billing & Plans',
                        iconName: 'card-outline',
                        variant: 'accent',
                        onPress: () => navigation.navigate('Billing'),
                      },
                      {
                        id: 'view_reports',
                        label: 'View Reports',
                        iconName: 'bar-chart-outline',
                        variant: 'accent',
                        onPress: () => navigation.navigate('Reports', {
                          employeeId: String(user?.employeeId || ''),
                          roleName: user?.roleName || '',
                        }),
                      },
                    ]}
                  />
                </View>
              </View>

              {/* 4. Global Activity Feed */}
              {/* <ActivityFeedWidget
                activities={notifications.map((n) => ({
                  id: n.id,
                  title: n.reason || 'Notification',
                  subtitle: n.reply || undefined,
                  time: n.created_at ? new Date(n.created_at).toLocaleTimeString() : undefined,
                  rawItem: n,
                }))}
                onConfirmReturn={handleConfirmReturn}
                onWorkflowAction={handleWorkflowAction}
                onHideNotification={hideNotification}
              /> */}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView >

      {/* DEPRECIATION DETAILS TABLE MODAL */}
      < Modal
        visible={isDepreciationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDepreciationModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            width: isDesktopWeb ? '80%' : '100%',
            maxHeight: '80%',
            backgroundColor: '#0F172A',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#334155',
            padding: 20,
            overflow: 'hidden'
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 15
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trending-down" size={24} color="#EAB308" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' }}>
                  Depreciating Assets (less than 60% Life Remaining)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsDepreciationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {depreciatingAssets.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 15 }}>No assets are currently depreciating under 60% life.</Text>
              </View>
            ) : (
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: 600 }}>
                  {/* Table Header */}
                  <View style={{
                    flexDirection: 'row',
                    backgroundColor: '#1E293B',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    borderBottomWidth: 1,
                    borderColor: '#334155'
                  }}>
                    <Text style={{ flex: 2, color: '#f2f5faff', fontWeight: 'bold', fontSize: 13 }}>Asset Name</Text>
                    <Text style={{ flex: 1.5, color: '#f2f5faff', fontWeight: 'bold', fontSize: 13 }}>Serial #</Text>
                    <Text style={{ flex: 1, color: '#f2f5faff', fontWeight: 'bold', fontSize: 13 }}>Purchase Price</Text>
                    <Text style={{ flex: 1.2, color: '#f2f5faff', fontWeight: 'bold', fontSize: 13 }}>Remaining Life</Text>
                    <Text style={{ flex: 1.2, color: '#f2f5faff', fontWeight: 'bold', fontSize: 13 }}>Book Value</Text>
                    <Text style={{ flex: 1.5, color: '#f2f5faff', fontWeight: 'bold', fontSize: 13 }}>Action Recommendation</Text>
                  </View>

                  {/* Table Body */}
                  <ScrollView style={{ maxHeight: 400 }}>
                    {depreciatingAssets.map((item, index) => (
                      <View key={item.id || index} style={{
                        flexDirection: 'row',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderBottomWidth: 1,
                        borderColor: 'rgba(51, 65, 85, 0.5)',
                        alignItems: 'center'
                      }}>
                        <Text style={{ flex: 2, color: '#F1F5F9', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ flex: 1.5, color: '#CBD5E1', fontSize: 13 }} numberOfLines={1}>{item.serialNo || 'N/A'}</Text>
                        <Text style={{ flex: 1, color: '#CBD5E1', fontSize: 13 }}>₹{parseFloat(item.price || 0).toLocaleString('en-IN')}</Text>
                        <Text style={{ flex: 1.2, color: item.percentLifeRemaining < 20 ? '#EF4444' : '#F59E0B', fontSize: 13, fontWeight: 'bold' }}>
                          {item.percentLifeRemaining}%
                        </Text>
                        <Text style={{ flex: 1.2, color: '#10B981', fontSize: 13, fontWeight: '600' }}>
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
          </View>
        </View>
      </Modal >

    </ImageBackground >
  );
};

export default CompanyDashboard;
