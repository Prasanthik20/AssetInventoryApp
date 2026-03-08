import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  FlatList,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import axios from 'axios';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { baseURL, RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { opratorStyles } from './operator.styles';

const isMobileDevice = Platform.OS !== 'web';

type DashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OperatorDashboard'
>;
type OperatorDashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OperatorDashboard'
>;

type Props = {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  navigation: OperatorDashboardNavigationProp;
};

// Define the structure of a Notification from the API
interface Notification {
  id: number;
  notificationId?: number;
  reason: string;
  status: string;
  reply: string;
  createdAt: string;
  asset: {
    id: number;
    name: string;
  };
  sender: {
    employeeId: number;
    name: string;
  };
  receiver: {
    employeeId: number;
    name: string;
  };
}

interface LocationStat {
  location: string;
  count: number;
}

const OperatorDashboard: React.FC<Props> = ({ user, setUser, navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'OperatorDashboard'>>();
  const styles = opratorStyles();
  // ----------------------------
  // 🔹 Get operator data
  // ----------------------------
  const [overdueCount, setOverdueCount] = useState(0);

  // ----------------------------
  // 🔹 Backend Data States
  // ----------------------------
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [assignedCount, setAssignedCount] = useState(0);
  const [currentLocation, setCurrentLocation] = useState('N/A');
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [showAllPendingNotifications, setShowAllPendingNotifications] =
    useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    assetName: string;
    onSubmit: (reason: string) => void;
  }>({
    title: '',
    assetName: '',
    onSubmit: () => {},
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOperatorData(); // This re-runs your API calls to get updated dates
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    // Clear local data
    setNotifications([]);
    setMyAssets([]);

    // Clear user → App.tsx will show AuthStack automatically
    setUser?.(null);
  };

  // ----------------------------
  // 🔹 Fetch operator assets
  // ----------------------------
  const fetchOperatorData = async () => {
    if (!user?.employeeId) return;
    try {
      const [assetsRes, notificationsRes] = await Promise.all([
        axios.get(
          `${baseURL}/api/operator/assets?operatorId=${user.employeeId}`,
        ),
        axios.get(
          `${baseURL}/api/notifications/operator?id=${user.employeeId}`,
        ),
      ]);
      //const data = await res.json();

      const rawAssets = assetsRes.data.assets || [];
      // 🔥 DEDUPLICATION LOGIC: Keep only one entry per assetId
      const uniqueAssetsMap = new Map();
      rawAssets.forEach((a: any) => {
        const id = a.assetId || a.id;
        // If we haven't seen this asset yet, or this record is newer, add it
        if (!uniqueAssetsMap.has(id)) {
          uniqueAssetsMap.set(id, {
            ...a,
            assignedBy: a.assignedBy || a.assigned_by || a.senderId,
            assetId: id,
            serialNumber: a.serialNumber || a.s_n || a.serial_number, // Add this line
          });
        }
      });
      const normalizedAssets = Array.from(uniqueAssetsMap.values());
      const overdueAssets = normalizedAssets.filter((a: any) =>
        isAssetOverdue(a.expectedReturnDate),
      );

      // Build location-wise counts from fetched assets.
      const locationCounts = normalizedAssets.reduce(
        (acc: Record<string, number>, asset: any) => {
          const locationKey =
            (asset?.location || 'Unknown').toString().trim() || 'Unknown';
          acc[locationKey] = (acc[locationKey] || 0) + 1;
          return acc;
        },
        {},
      );

      const locationEntries = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([location, count]) => ({
          location,
          count: Number(count),
        }));

      setMyAssets(normalizedAssets);
      setOverdueCount(overdueAssets.length);
      setAssignedCount(normalizedAssets.length);
      setCurrentLocation(locationEntries[0]?.location || 'N/A');
      setLocationStats(locationEntries);
      const mappedNotifications = (notificationsRes.data.notifications || [])
        .map((n: any) => {
          console.log('Raw Notification from API:', n);
          return {
            id: n.id,
            reason: n.reason,
            status: n.status, // Ensure status is mapped
            reply: n.reply,
            createdAt: n.created_at,
            asset: {
              id: n.assetId,
              name: n.assetName || (n.asset ? n.asset.name : 'Unknown Asset'),
            },
            sender: {
              employeeId: n.senderId || n.sender?.employeeId,
              name:
                n.senderName || (n.sender ? n.sender.fullName : 'Supervisor'),
            },
            receiver: {
              employeeId: n.receiverId || n.receiver?.employeeId,
              name:
                n.receiverName ||
                (n.receiver ? n.receiver.fullName : 'Operator'),
            },
          };
        }) // End of .map()
        .sort((a: Notification, b: Notification) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });

      setNotifications(mappedNotifications);
    } catch (err) {
      console.log('Operator Assets API Error:', err);
    }
  };

  useEffect(() => {
    if (route.params?.refresh) {
      console.log('🔄 Return detected, refreshing dashboard data...');
      fetchOperatorData();

      // Clear the refresh param so it doesn't loop
      navigation.setParams({ refresh: undefined } as any);
    }
  }, [route.params?.refresh]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshData = async () => {
        if (user?.employeeId && isActive) {
          await fetchOperatorData();
        }
      };

      refreshData();

      return () => {
        isActive = false;
      };
    }, [user?.employeeId]), // This is correct, but ensure fetchOperatorData is fresh
  );

  // ----------------------------
  // 🔹 Modal Handlers
  // ----------------------------
  const handleOpenModal = (config: {
    title: string;
    assetName: string;
    onSubmit: (reason: string) => void;
  }) => {
    setModalConfig(config);
    setModalVisible(true);
  };

  const handleCloseModal = () => setModalVisible(false);

  // Update the signature to accept the asset object
  const handleOverdueSubmit = async (reason: string, selectedAsset?: any) => {
    // Use either the passed asset or find it by name as a fallback
    console.log('Submitting for asset:', modalConfig.assetName);
    const asset =
      selectedAsset ||
      myAssets.find(a => a.assetName === modalConfig.assetName);

    if (!asset || (!asset.assignedBy && !asset.assigned_by)) {
      console.error('Missing Supervisor ID. Asset data:', asset);
      console.error('Critical: No asset context found for submission');
      Alert.alert('Error', 'Could not identify which asset to update.');
      return;
    }

    try {
      const payload = {
        assetId: asset.assetId,
        assignmentId: asset.assignmentId || null,
        operatorId: Number(user?.employeeId),
        supervisorId: asset.assignedBy || asset.assigned_by,
        reason: reason,
      };
      console.log('DEBUG PAYLOAD:', payload);
      console.log('🚀 Sending notification for:', asset.assetName);

      const response = await axios.post(
        `${baseURL}/api/notifications/overdue`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Extension request sent to your supervisor.');
        handleCloseModal();
        fetchOperatorData(); // Refresh to ensure synchronization
      }
    } catch (error: any) {
      console.error(
        'Overdue send error:',
        error.response?.data || error.message,
      );
      Alert.alert('Error', 'Failed to reach server.');
    }
  };

  const handleReplySubmit = async (
    replyMessage: string,
    notification: Notification,
  ) => {
    // The 'sender' of the original alert is the 'receiver' of this reply
    const supervisorId = notification.sender?.employeeId;
    const operatorId = user?.employeeId; // Current logged-in user

    if (!supervisorId || !operatorId) {
      Alert.alert(
        'Error',
        'Required user information is missing. Please refresh.',
      );
      console.error('IDs missing:', { supervisorId, operatorId });
      return;
    }

    try {
      const payload = {
        originalNotificationId: Number(notification.id),
        replyMessage,
        senderId: Number(operatorId), // Operator sending the reply
        receiverId: Number(supervisorId), // Supervisor receiving the reply
        status: 'replied', // New status
      };

      await axios.post(`${baseURL}/api/notifications/reply`, payload);
      // Move this item to history immediately in UI by marking it as replied.
      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id
            ? { ...item, reply: replyMessage, status: 'replied' }
            : item,
        ),
      );
      Alert.alert('Success', 'Reply sent successfully!');
      handleCloseModal();
      fetchOperatorData(); // Refresh to see the status change
    } catch (error: any) {
      console.error('Reply Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Could not send reply. Check server logs.');
    }
  };

  // 🔥 Enhanced check to ensure we don't mark items as overdue if they are returned
  const isAssetOverdue = (expectedReturnDate?: string | null) => {
    if (!expectedReturnDate) return false;

    // 🇮🇳 Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istToday = new Date(
      now.getTime() + now.getTimezoneOffset() * 60000 + istOffset,
    );
    istToday.setHours(0, 0, 0, 0);

    // 📅 Parse the date provided (could be original or extended)
    const returnDate = new Date(expectedReturnDate);
    const istReturnDate = new Date(
      returnDate.getTime() + returnDate.getTimezoneOffset() * 60000 + istOffset,
    );
    istReturnDate.setHours(0, 0, 0, 0);

    // Returns true only if the date is strictly in the past
    return istReturnDate < istToday;
  };

  const getUpdatedReturnDate = (assetId: number) => {
    const n = notifications.find(
      x =>
        x.asset.id === assetId &&
        (x.reason?.toLowerCase().includes('extension approved') || // Matches your backend 'reason'
          x.reply?.toLowerCase().includes('extended')), // Matches your backend 'reply'
    );

    if (!n) return null;

    // Instead of trying to find a date string which isn't there,
    // we return a flag or the original date to indicate it is now valid.
    return 'extended';
  };

  const pendingReplyNotifications = notifications.filter(item => {
    const isFromSupervisor =
      Number(item.sender?.employeeId) !== Number(user?.employeeId);
    const hasReply = !!item.reply && item.reply.trim().length > 0;
    const isResolved = item.status === 'resolved';
    return isFromSupervisor && !hasReply && !isResolved;
  });

  const visibleMyAssets = showAllAssets ? myAssets : myAssets.slice(0, 5);
  const visiblePendingNotifications = showAllPendingNotifications
    ? pendingReplyNotifications
    : pendingReplyNotifications.slice(0, 5);

  const historyNotifications = notifications.filter(item => {
    const isFromSupervisor =
      Number(item.sender?.employeeId) !== Number(user?.employeeId);
    const hasReply = !!item.reply && item.reply.trim().length > 0;
    const isResolved = item.status === 'resolved';
    return !isFromSupervisor || hasReply || isResolved;
  });

  const visibleHistoryNotifications = showAllHistory
    ? historyNotifications
    : historyNotifications.slice(0, 5);

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* {!isMobileDevice && (
          <LinearGradient
            colors={["rgba(93, 113, 200, 0.7)", "rgba(59, 89, 184, 0.8)"]}
            style={styles.leftPanel}
          >
            <Image source={{ uri: "https://i.imgur.com/gYf2xmm.png" }} style={styles.leftPanelImage} />
            <Text style={styles.leftPanelTitle}>YOUR ASSIGNED{"\n"}EQUIPMENT</Text>
            <Text style={styles.leftPanelSubtitle}>ASSETFLOW PRO</Text>
          </LinearGradient>
        )} */}

          <ScrollView
            style={styles.rightPanel}
            contentContainerStyle={{ paddingBottom: 50 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B59B8']} // Android color
                tintColor={'#3B59B8'} // iOS color
              />
            }
          >
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{user?.operatorName}</Text>

              <View style={styles.headerRight}>
                <Feather name="user" size={16} color="#333" />
                <Text style={styles.userText}>{user?.roleName}</Text>
                <TouchableOpacity onPress={handleLogout}>
                  <Feather
                    name="log-out"
                    size={22}
                    color="red"
                    style={{ marginLeft: 10 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* METRICS */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <View style={styles.metricRow}>
                  <View style={styles.metricIconBg}>
                    <Ionicons
                      name="construct-outline"
                      size={20}
                      color="#3B59B8"
                    />
                  </View>
                  <Text style={styles.metricTitle}>Assigned Assets</Text>
                </View>
                <Text style={styles.metricValue}>{assignedCount}</Text>
              </View>

              <View style={styles.metricBox}>
                <View style={styles.metricRow}>
                  <View style={styles.metricIconBg}>
                    <Feather name="map-pin" size={18} color="#3B59B8" />
                  </View>
                  <Text style={styles.metricTitle}>Assets By Location</Text>
                </View>
                {locationStats.length === 0 ? (
                  <Text style={[styles.metricValue, styles.locationMetricValue]}>
                    N/A
                  </Text>
                ) : (
                  <View style={styles.locationGrid}>
                    {locationStats.map(item => (
                      <View key={item.location} style={styles.locationCell}>
                        <Text style={styles.locationName} numberOfLines={1}>
                          {item.location}
                        </Text>
                        <Text style={styles.locationCount}>{item.count}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <View
              style={[
                styles.dashboardTwoColumnRow,
                !isMobileDevice && styles.dashboardTwoColumnRowWeb,
              ]}
            >
              {/* ASSETS */}
              <View
                style={[
                  styles.assetsSection,
                  styles.dashboardColumn,
                  !isMobileDevice && styles.dashboardColumnWeb,
                ]}
              >
                <View style={styles.notificationsHeaderRow}>
                  <Text style={styles.sectionTitle}>My Assets</Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ReturnAsset', {
                        assets: myAssets,
                        operatorEmployeeId: user?.employeeId,
                      })
                    }
                  >
                    <LinearGradient
                      colors={['#27B2C3', '#40D69B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.returnButtonCompact}
                    >
                      <Text style={styles.returnButtonCompactText}>
                        RETURN ASSET
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                {myAssets.length === 0 ? (
                  <Text style={{ color: '#333', marginTop: 10 }}>
                    No assets assigned.
                  </Text>
                ) : (
                  visibleMyAssets.map((asset, index) => {
                    const updatedReturnDate = getUpdatedReturnDate(
                      asset.assetId,
                    );
                    const rawDate =
                      updatedReturnDate || asset.expectedReturnDate;

                    // 🔥 IST Consistent Formatting
                    const formattedDate = rawDate
                      ? new Date(rawDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          timeZone: 'Asia/Kolkata',
                        })
                      : 'No due date';
                    const isOverdue = rawDate && isAssetOverdue(rawDate);
                    const isExtended = Boolean(updatedReturnDate);

                    return (
                      <View style={styles.assetItem} key={index}>
                        <View style={styles.assetIconBg}>
                          <Ionicons
                            name="cube-outline"
                            size={20}
                            color="#3B59B8"
                          />
                        </View>

                        <View style={styles.assetNameContainer}>
                          <Text style={styles.assetName}>
                            {asset.assetName}
                          </Text>

                          {/* 👇 Displaying Serial Number and Barcode */}
                          <View style={{ flexDirection: 'row', marginTop: 2 }}>
                            <Text
                              style={{
                                fontSize: 12,
                                color: '#4A5568',
                                fontWeight: '500',
                              }}
                            >
                              S/N:{' '}
                              <Text style={{ color: '#1A202C' }}>
                                {asset.serialNo || 'N/A'}
                              </Text>
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: '#4A5568',
                                marginLeft: 10,
                                fontWeight: '500',
                              }}
                            >
                              Barcode:{' '}
                              <Text style={{ color: '#1A202C' }}>
                                {asset.barcode}
                              </Text>
                            </Text>
                          </View>
                        </View>
                        <View style={styles.dueDateContainer}>
                          <Text
                            style={[
                              styles.assetDueDate,
                              isOverdue
                                ? { color: 'red', fontWeight: 'bold' }
                                : isExtended
                                ? { color: 'green', fontWeight: 'bold' }
                                : {},
                            ]}
                          >
                            {isOverdue
                              ? 'OVERDUE'
                              : isExtended
                              ? `Extended: ${formattedDate}`
                              : formattedDate}
                          </Text>

                          {/* Only show "Update" if it's overdue AND hasn't been extended yet today */}
                          {isOverdue && !isExtended && (
                            <TouchableOpacity
                              style={styles.notifyButton}
                              onPress={() => {
                                handleOpenModal({
                                  title: 'Extension Request',
                                  assetName: asset.assetName,
                                  onSubmit: reason =>
                                    handleOverdueSubmit(reason, asset),
                                });
                              }}
                            >
                              <Text style={styles.notifyButtonText}>
                                Update
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                {myAssets.length > 5 && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setShowAllAssets(prev => !prev)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllAssets
                        ? 'Show Less'
                        : `Show More (${myAssets.length - 5} more)`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* NOTIFICATIONS */}
              <View
                style={[
                  styles.assetsSection,
                  styles.dashboardColumn,
                  !isMobileDevice && styles.dashboardColumnWeb,
                ]}
              >
                <View style={styles.notificationsHeaderRow}>
                  <Text style={styles.sectionTitle}>Notifications</Text>
                  {/* <Text style={styles.subSectionTitle}>Reply To Supervisor</Text> */}
                </View>
                <View
                  style={[
                    styles.replyRowContainer,
                    !isMobileDevice && styles.replyRowContainerWeb,
                  ]}
                >
                  {pendingReplyNotifications.length === 0 ? (
                    <Text style={styles.noItemsText}>No pending replies.</Text>
                  ) : (
                    visiblePendingNotifications.map(item => {
                      const isFromSupervisor =
                        Number(item.sender.employeeId) !==
                        Number(user?.employeeId);
                      const isResolved = item.status === 'resolved';
                      const hasReplied = !!item.reply && item.reply.length > 0;

                      return (
                        <View
                          key={item.id.toString()}
                          style={[
                            styles.notificationItem,
                            !isMobileDevice && styles.replyRowItemWeb,
                            isFromSupervisor
                              ? {
                                  backgroundColor: '#f0f9ff',
                                  borderColor: '#bae6fd',
                                  borderWidth: 1,
                                }
                              : {},
                            isResolved && {
                              opacity: 0.5,
                              backgroundColor: '#f5f5f5',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              isResolved
                                ? 'checkmark-done-circle'
                                : isFromSupervisor
                                ? 'checkmark-circle-outline'
                                : 'notifications-outline'
                            }
                            size={24}
                            color={
                              isResolved
                                ? '#999'
                                : isFromSupervisor
                                ? '#0284c7'
                                : '#4A55A2'
                            }
                          />

                          <View style={styles.notificationContent}>
                            <Text
                              style={[
                                styles.notificationText,
                                isResolved && { color: '#999' },
                              ]}
                            >
                              {isFromSupervisor ? (
                                <Text
                                  style={{
                                    color: '#0369a1',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  Update from Supervisor:
                                </Text>
                              ) : (
                                <Text>
                                  Your Request for{' '}
                                  <Text style={{ fontWeight: 'bold' }}>
                                    {item.asset.name}
                                  </Text>
                                  :
                                </Text>
                              )}
                            </Text>
                            <Text
                              style={[
                                styles.notificationReason,
                                isResolved && {
                                  color: '#999',
                                  fontStyle: 'italic',
                                },
                              ]}
                            >
                              "{item.reason}"
                            </Text>

                            {hasReplied && (
                              <Text style={styles.repliedText}>
                                <Text style={{ fontWeight: 'bold' }}>
                                  Message:{' '}
                                </Text>
                                "{item.reply}"
                              </Text>
                            )}
                          </View>

                          {isFromSupervisor && !hasReplied && !isResolved && (
                            <TouchableOpacity
                              style={styles.replyButton}
                              onPress={() =>
                                handleOpenModal({
                                  title: `Reply to Supervisor`,
                                  assetName: item.asset.name,
                                  onSubmit: replyMessage =>
                                    handleReplySubmit(replyMessage, item),
                                })
                              }
                            >
                              <Text style={styles.replyButtonText}>Reply</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                {pendingReplyNotifications.length > 5 && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() =>
                      setShowAllPendingNotifications(prev => !prev)
                    }
                  >
                    <Text style={styles.showMoreText}>
                      {showAllPendingNotifications
                        ? 'Show Less'
                        : `Show More (${
                            pendingReplyNotifications.length - 5
                          } more)`}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>
                  History
                </Text>
                {historyNotifications.length === 0 ? (
                  <Text style={styles.noItemsText}>
                    No history notifications.
                  </Text>
                ) : (
                  visibleHistoryNotifications.map(item => {
                    const isFromSupervisor =
                      Number(item.sender.employeeId) !==
                      Number(user?.employeeId);
                    const isResolved = item.status === 'resolved';
                    const hasReplied = !!item.reply && item.reply.length > 0;

                    return (
                      <View
                        key={`history-${item.id.toString()}`}
                        style={[
                          styles.notificationItem,
                          isFromSupervisor
                            ? {
                                backgroundColor: '#f8fafc',
                                borderColor: '#cbd5e1',
                                borderWidth: 1,
                              }
                            : {},
                          isResolved && {
                            opacity: 0.75,
                            backgroundColor: '#f5f5f5',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            isResolved
                              ? 'checkmark-done-circle'
                              : hasReplied
                              ? 'checkmark-circle'
                              : 'notifications-outline'
                          }
                          size={24}
                          color={
                            isResolved
                              ? '#6b7280'
                              : hasReplied
                              ? '#16a34a'
                              : '#4A55A2'
                          }
                        />

                        <View style={styles.notificationContent}>
                          <Text
                            style={[
                              styles.notificationText,
                              isResolved && { color: '#6b7280' },
                            ]}
                          >
                            {isFromSupervisor ? (
                              <Text
                                style={{ color: '#334155', fontWeight: 'bold' }}
                              >
                                Supervisor Update:
                              </Text>
                            ) : (
                              <Text>
                                Your Request for{' '}
                                <Text style={{ fontWeight: 'bold' }}>
                                  {item.asset.name}
                                </Text>
                                :
                              </Text>
                            )}
                          </Text>
                          <Text
                            style={[
                              styles.notificationReason,
                              isResolved && {
                                color: '#6b7280',
                                fontStyle: 'italic',
                              },
                            ]}
                          >
                            "{item.reason}"
                          </Text>

                          {hasReplied && (
                            <Text style={styles.repliedText}>
                              <Text style={{ fontWeight: 'bold' }}>
                                Reply Sent:{' '}
                              </Text>
                              "{item.reply}"
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                {historyNotifications.length > 5 && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setShowAllHistory(prev => !prev)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllHistory
                        ? 'Show Less'
                        : `Show More (${historyNotifications.length - 5} more)`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>

        <OverdueNotificationModal
          visible={modalVisible}
          onClose={handleCloseModal}
          onSubmit={modalConfig.onSubmit}
          assetName={modalConfig.assetName}
          title={modalConfig.title}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

export default OperatorDashboard;
