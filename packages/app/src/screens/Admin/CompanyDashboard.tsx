import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
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
  const [users, setUsers] = useState([]);
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

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${baseURL}/api/auth/users`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.users)) {
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
      // Axios returns a response object; the actual data is in .data
      const response = await axios.get(`${baseURL}/api/dashboard`);

      const data = response.data;

      setTotalAssets(data.totalAssets);
      setOfficeAssets(data.officeAssets);
      setFieldAssets(data.fieldAssets);
    } catch (error: any) {
      // Axios gives you more detail on errors (e.g., error.response.data)
      console.log(
        'Dashboard API Error:',
        error.response?.data || error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    setAppUser(null);
  };

  const fetchGlobalNotifications = async () => {
    if (!user?.employeeId) return;
    try {
      const response = await axios.get(`${baseURL}/api/notifications/admin`);
      console.log('Employee ID:', user?.employeeId);
      console.log(
        'Fetching:',
        `${baseURL}/api/notifications/admin?id=${user?.employeeId}`,
      );

      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Axios notification error:', error);
    }
  };

  const fetchAssetAnalytics = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/assets`);
      const assets = response.data?.assets || response.data || [];

      const normalizeStatus = (value: unknown) =>
        String(value || '')
          .toLowerCase()
          .replace(/[\s_-]+/g, ' ')
          .trim();

      let unassigned = 0;
      let assigned = 0;
      let overdue = 0;
      let underMaintenance = 0;
      const locationCounts: Record<string, number> = {};

      assets.forEach((asset: any) => {
        const status = normalizeStatus(asset.status);

        if (status === 'unassigned') unassigned += 1;
        if (status === 'assigned') assigned += 1;
        if (status === 'overdue') overdue += 1;
        if (status === 'under maintenance' || status === 'maintenance') {
          underMaintenance += 1;
        }

        if (status === 'assigned' || status === 'overdue') {
          const locationKey =
            (asset?.location || 'Unknown').toString().trim() || 'Unknown';
          locationCounts[locationKey] = (locationCounts[locationKey] || 0) + 1;
        }
      });

      const locationEntries = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([location, count]) => ({
          location,
          count: Number(count),
        }));

      setUnassignedAssets(unassigned);
      setAssignedAssets(assigned);
      setOverdueAssets(overdue);
      setUnderMaintenanceAssets(underMaintenance);
      setFieldLocationStats(locationEntries);
    } catch (error) {
      console.error('Asset analytics fetch error:', error);
      setUnassignedAssets(0);
      setAssignedAssets(0);
      setOverdueAssets(0);
      setUnderMaintenanceAssets(0);
      setFieldLocationStats([]);
    }
  };

  const hideNotification = async (id: number) => {
    try {
      await axios.put(`${baseURL}/api/notifications/hide`, { id });

      setNotifications(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error(error);
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
      fetchAssetAnalytics();
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
                    <Feather name="log-out" size={24} color="#FF4D4D" />
                  </TouchableOpacity>
                </View>
              )}

              {/* System Overview Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Analytics</Text>
                {!isMobileLayout && (
                  <View style={styles.headerRight}>
                    <Ionicons name="person-outline" size={16} color="#333" />
                    <Text style={styles.userText}>{user?.fullName}</Text>
                    <TouchableOpacity onPress={handleLogout}>
                      <Feather name="log-out" size={24} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Metrics Grid - 4 in a row on Web */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    onPress={() => navigation.navigate('TotalAssetDetails')}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={24}
                      color="#6B46C1"
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
                    <Ionicons name="people-outline" size={24} color="#6B46C1" />
                    <Text style={styles.metricLabel}>Total Users</Text>
                  </TouchableOpacity>
                  <Text style={styles.metricValue}>{totalUsers ?? 0}</Text>
                </View>

                <View style={styles.metricBox}>
                  <TouchableOpacity
                    style={styles.metricRow}
                    onPress={() => navigation.navigate('OfficeAssets')}
                  >
                    <Ionicons
                      name="business-outline"
                      size={24}
                      color="#6B46C1"
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
                    <Ionicons name="map-outline" size={24} color="#6B46C1" />
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
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color="#DD6B20"
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
                    <Ionicons
                      name="checkmark-done-outline"
                      size={24}
                      color="#2B6CB0"
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
                    <Ionicons
                      name="alert-circle-outline"
                      size={24}
                      color="#C53030"
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
                    <Ionicons name="build-outline" size={24} color="#6B46C1" />
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
                                  <Ionicons
                                    name={
                                      isExpanded ? 'chevron-up' : 'chevron-down'
                                    }
                                    size={20}
                                    color="#718096"
                                  />
                                </TouchableOpacity>

                                {/* Group Notifications */}
                                {isExpanded &&
                                  userNotifications.map(
                                    (item: any, index: number) => (
                                      <TouchableOpacity
                                        key={
                                          item.id || `${groupIndex}-${index}`
                                        }
                                        style={styles.notifLine}
                                        onPress={() =>
                                          hideNotification(item.id)
                                        }
                                        activeOpacity={0.7}
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
                                            "{item.message}"
                                          </Text>

                                          <Text style={styles.tapToHideText}>
                                            Tap to mark as seen
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    ),
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
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddEditAsset')}
                  >
                    <LinearGradient
                      colors={['#4A90E2', '#2E5C8A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addUserButton}
                    >
                      <Ionicons name="cube-outline" size={20} color="#fff" />
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
                      colors={['#7C3AED', '#5B21B6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addUserButton}
                    >
                      <Ionicons
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
                      colors={['#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addUserButton}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.addUserButtonText}>Add New User</Text>
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
