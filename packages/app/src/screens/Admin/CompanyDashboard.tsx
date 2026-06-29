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
    if (!user?.employeeId) return;
    try {
      const response = await axios.get(`${baseURL}/api/notifications/admin`, {
        params: { id: user.employeeId }
      });
      console.log('Employee ID:', user?.employeeId);

      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Axios notification error:', error);
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
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* Main Content Area */}
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
              {/* Mobile Header */}
              {isMobileLayout && (
                <View style={styles.mobileHeaderCard}>
                  <View style={styles.mobileUserRow}>
                    <Image
                      source={{
                        uri:
                          user?.photoURL || 'https://i.imgur.com/6VBx3io.png',
                      }}
                      style={styles.mobileAvatar}
                    />
                    <View>
                      <Text style={styles.mobileAdminName}>
                        {user?.fullName}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleLogout}>
                    <SafeFeatherIcon name="log-out" size={24} color="#FF4D4D" />
                  </TouchableOpacity>
                </View>
              )}

              {/* System Overview Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Analytics</Text>
                {!isMobileLayout && (
                  <View style={styles.headerRight}>
                    <SafeIonicons name="person-outline" size={16} color="#A9C6E4" />
                    <Text style={styles.userText}>{user?.fullName}</Text>
                    <TouchableOpacity onPress={handleLogout}>
                      <SafeFeatherIcon name="log-out" size={24} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 🛡️ SUBSCRIPTION USAGE WIDGET */}
              {subscription && (
                <View style={[styles.metricBox, { width: '100%', marginBottom: 16, padding: 16, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E3A8A' }}>
                      {subscription.plan} Plan - {subscription.status.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#3B82F6' }}>
                      Renews: {new Date(subscription.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {/* Users Progress Bar */}
                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#475569' }}>User Limits</Text>
                      <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600' }}>{totalUsers} / {subscription.maxUsers === 999999 ? 'Unlimited' : subscription.maxUsers}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#DBEAFE', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${subscription.userUsagePercent}%`, backgroundColor: subscription.userUsagePercent > 80 ? '#EF4444' : '#3B82F6' }} />
                    </View>
                  </View>

                  {/* Assets Progress Bar */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#475569' }}>Asset Limits</Text>
                      <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600' }}>{totalAssets} / {subscription.maxAssets === 999999 ? 'Unlimited' : subscription.maxAssets}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#DBEAFE', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${subscription.assetUsagePercent}%`, backgroundColor: subscription.assetUsagePercent > 80 ? '#EF4444' : '#10B981' }} />
                    </View>
                  </View>
                </View>
              )}

              {/* Expired Subscription Banner */}
              {isSubscriptionExpired && (
                <View style={{ backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#B91C1C', fontWeight: 'bold', fontSize: 14 }}>
                    Your subscription has expired. You have view-only access.
                  </Text>
                </View>
              )}

              {/* Metrics Grid - 4 in a row on Web */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    onPress={() => navigation.navigate('TotalAssetDetails')}
                  >
                    <SafeIonicons
                      name="settings-outline"
                      size={24}
                      color="#34D399"
                    />
                    <Text style={styles.metricLabel}>Total Assets</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{totalAssets ?? 0}</Text>
                </View>

                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    onPress={() => navigation.navigate('CompanyUsersScreen')}
                  >
                    <SafeIonicons name="people-outline" size={24} color="#38BDF8" />
                    <Text style={styles.metricLabel}>Total Users</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{totalUsers ?? 0}</Text>
                </View>

                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('CustomCategoryBuilder')}
                  >
                    <SafeIonicons name="folder-open-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.metricLabel}>Total Categories</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{totalCategories}</Text>
                </View>

                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    onPress={() => navigation.navigate('OfficeAssets')}
                  >
                    <SafeIonicons
                      name="business-outline"
                      size={24}
                      color="#F59E0B"
                    />
                    <Text style={styles.metricLabel}>Office Assets</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{officeAssets ?? 0}</Text>
                </View>

                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={[styles.metricRow, styles.fieldMetricBox]}
                    onPress={() => navigation.navigate('FieldAssets')}
                  >
                    <SafeIonicons name="map-outline" size={24} color="#22D3EE" />
                    <Text style={styles.metricValue}>{fieldAssets ?? 0}</Text>
                    <Text style={styles.metricLabel}>Field Assets</Text>
                  </TouchableOpacity>
                  <View style={styles.fieldLocationGrid}>
                    {fieldLocationStats.length === 0 ? (
                      <Text style={styles.fieldLocationEmpty}>
                        No location data
                      </Text>
                    ) : (
                      fieldLocationStats.slice(0, 4).map(item => (
                        <View
                          key={item.location}
                          style={styles.fieldLocationCell}
                        >
                          <Text
                            style={styles.fieldLocationName}
                            numberOfLines={1}
                          >
                            {item.location}
                          </Text>
                          <Text style={styles.fieldLocationCount}>
                            {item.count}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('TotalAssetDetails', {
                        statusFilter: 'Unassigned',
                      })
                    }
                  >
                    <SafeIonicons
                      name="remove-circle-outline"
                      size={24}
                      color="#FB7185"
                    />
                    <Text style={styles.metricLabel}>Unassigned Assets</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{unassignedAssets}</Text>
                </View>
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('TotalAssetDetails', {
                        statusFilter: 'Assigned',
                      })
                    }
                  >
                    <SafeIonicons
                      name="checkmark-done-outline"
                      size={24}
                      color="#34D399"
                    />
                    <Text style={styles.metricLabel}>Assigned Assets</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{assignedAssets}</Text>
                </View>
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('TotalAssetDetails', {
                        statusFilter: 'Overdue',
                      })
                    }
                  >
                    <SafeIonicons
                      name="alert-circle-outline"
                      size={24}
                      color="#F97373"
                    />
                    <Text style={styles.metricLabel}>Overdue Assets</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{overdueAssets}</Text>
                </View>
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('TotalAssetDetails', {
                        statusFilter: 'Under Maintenance',
                      })
                    }
                  >
                    <SafeIonicons name="build-outline" size={24} color="#F59E0B" />
                    <Text style={styles.metricLabel}>Under Maintenance</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>
                    {underMaintenanceAssets}
                  </Text>
                </View>
              </View>

              {/* Bottom Content Row - Side-by-Side on Web */}
              <View style={styles.bottomRow}>
                {/* Activity Feed */}
                <View style={styles.feedContainer}>
                  <Text style={styles.sectionTitle}>Global Activity Feed</Text>
                  <View style={styles.notificationFeed}>
                    {notifications.length > 0 ? (
                      (() => {
                        // Group notifications by sender
                        const groupedNotifications = notifications.reduce(
                          (acc, item) => {
                            const senderName = item.sender?.name || 'Unknown';
                            if (!acc[senderName]) {
                              acc[senderName] = [];
                            }
                            acc[senderName].push(item);
                            return acc;
                          },
                          {} as Record<string, any[]>,
                        );

                        return Object.keys(groupedNotifications).map(
                          (senderName, groupIndex) => {
                            const userNotifications =
                              groupedNotifications[senderName];
                            const firstNotif = userNotifications[0];
                            const isSupervisor = senderName
                              .toLowerCase()
                              .includes('supervisor');
                            const isExpanded = expandedGroups.has(senderName);

                            return (
                              <View
                                key={`group-${groupIndex}`}
                                style={styles.notifGroup}
                              >
                                {/* Group Header */}
                                <TouchableOpacity
                                  style={styles.groupHeader}
                                  onPress={() => toggleGroup(senderName)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.groupHeaderLeft}>
                                    <View
                                      style={[
                                        styles.groupIndicator,
                                        {
                                          backgroundColor: isSupervisor
                                            ? '#4C51BF'
                                            : '#38B2AC',
                                        },
                                      ]}
                                    />
                                    <Text style={styles.groupSenderName}>
                                      {senderName}
                                    </Text>
                                    <View
                                      style={[
                                        styles.notifBadge,
                                        {
                                          backgroundColor: isSupervisor
                                            ? '#E9D5FF'
                                            : '#B2F5EA',
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.notifBadgeText,
                                          {
                                            color: isSupervisor
                                              ? '#6B21A8'
                                              : '#00796B',
                                          },
                                        ]}
                                      >
                                        {userNotifications.length}
                                      </Text>
                                    </View>
                                  </View>
                                  <SafeIonicons
                                    name={
                                      isExpanded ? 'chevron-up' : 'chevron-down'
                                    }
                                    size={20}
                                    color="#718096"
                                  />
                                </TouchableOpacity>

                                {/* Group Notifications */}
                                {isExpanded && (
                                  <ScrollView
                                    style={styles.groupNotificationsScroll}
                                    contentContainerStyle={styles.groupNotificationsScrollContent}
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                  >
                                    {userNotifications.map(
                                      (item: any, index: number) => {
                                        const isReturnPending = isReturnPendingNotification(item.reason, item.reply, item.status);
                                        const displayMessage = parseNotificationMessage(item.reply, item.reason);

                                        return (
                                        <View
                                          key={
                                            item.id || `${groupIndex}-${index}`
                                          }
                                          style={styles.notifLine}
                                        >
                                          <View style={styles.notifMainContent}>
                                            <View style={styles.notifHeaderRow}>
                                              <View style={styles.tagContainer}>
                                                <Text style={styles.roleTagText}>
                                                  {item.status}
                                                </Text>
                                              </View>
                                              <Text style={styles.notifTime}>
                                                {item.createdAt
                                                  ? new Date(
                                                      item.createdAt,
                                                    ).toLocaleDateString('en-GB')
                                                  : ''}
                                              </Text>
                                            </View>

                                            <Text style={styles.assetContext}>
                                              Asset:{' '}
                                              <Text
                                                style={{ fontWeight: 'bold' }}
                                              >
                                                {item.asset?.name || 'N/A'}
                                              </Text>
                                            </Text>

                                            <Text
                                              style={styles.notifMessage}
                                              numberOfLines={2}
                                            >
                                              "{displayMessage}"
                                            </Text>

                                            {item.receiver?.name ? (
                                              <Text style={styles.tapToHideText}>
                                                Receiver: {item.receiver.name}
                                              </Text>
                                            ) : null}

                                            <View style={styles.notifActionRow}>
                                              {isReturnPending && (
                                                <TouchableOpacity
                                                  style={[styles.inlineActionButton, styles.confirmReturnButton]}
                                                  onPress={() => handleConfirmReturn(item)}
                                                  activeOpacity={0.8}
                                                >
                                                  <Text style={styles.inlineActionButtonText}>Confirm Return</Text>
                                                </TouchableOpacity>
                                              )}
                                              <TouchableOpacity
                                                style={styles.inlineActionButton}
                                                onPress={() => hideNotification(item.id)}
                                                activeOpacity={0.8}
                                              >
                                                <Text style={styles.inlineActionButtonText}>Mark as seen</Text>
                                              </TouchableOpacity>
                                            </View>
                                          </View>
                                        </View>
                                      );
                                      },
                                    )}
                                  </ScrollView>
                                )}
                              </View>
                            );
                          },
                        );
                      })()
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                          No activity recorded
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  
                  {!isSubscriptionExpired && (
                    <>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('AddEditAsset')}
                      >
                        <LinearGradient
                          colors={['#1E3A5F', '#162D4A']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.addUserButton}
                        >
                          <SafeIonicons name="cube-outline" size={20} color="#fff" />
                          <Text style={styles.addUserButtonText}>
                            Add New Asset
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('AssignAsset', {
                            supervisor_employeeId: user?.employeeId || '',
                            supervisorName: user?.fullName || 'Admin',
                          })
                        }
                      >
                        <LinearGradient
                          colors={['#1F4C63', '#1A3D51']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.addUserButton}
                        >
                          <SafeIonicons
                            name="hand-right-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.addUserButtonText}>Assign Asset</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => navigation.navigate('AddCompanyUser')}
                      >
                        <LinearGradient
                          colors={['#334155', '#1E293B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.addUserButton}
                        >
                          <SafeIonicons
                            name="person-add-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.addUserButtonText}>Add New User</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('Reports', {
                        employeeId: String(user?.employeeId || ''),
                        roleName: String(user?.roleName || 'Admin'),
                      })
                    }
                  >
                    <LinearGradient
                      colors={['#243B6B', '#1E3157']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addUserButton}
                    >
                      <SafeIonicons
                        name="document-text-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.addUserButtonText}>View Reports</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default CompanyDashboard;
