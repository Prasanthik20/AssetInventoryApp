import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Switch,
  ImageBackground,
  Modal,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, Route, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { baseURL, RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { supervisorStyles } from './supervisor.styles';
import AppSnackbar from 'src/components/common/AppSnackbar';

type SupervisorDashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SupervisorDashboard'
>;

type DashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SupervisorDashboard'
>;
type Props = {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  navigation: SupervisorDashboardNavigationProp;
};
type MetricScreens =
  | 'TotalAssetDetails'
  | 'OfficeAssets'
  | 'FieldAssets'
  | 'AddEditAsset';

export type SupervisorStackParamList = {
  SupervisorDashboard: {
    supervisorName: string;
    roleName: string;
    employeeId: string;
  };
  AddEditAsset: undefined;
  AssignAsset: {
    supervisor_employeeId: string; // <-- pass this to assign asset
    supervisorName: string;
  };
  TotalAssetDetails: undefined;
  OfficeAssets: undefined;
  FieldAssets: undefined;
};

interface Metric {
  title: string;
  icon: string;
  value: number;
  navigateTo?: MetricScreens;
}

interface OperatorReply {
  notificationId: number;
  assignmentId?: number;
  operatorName: string;
  assetName: string;
  reason: string;
  reply: string;
  status?: string;
  senderId?: number;
  receiverId?: number;
  isAssignment: boolean;
}

const parseReplyPayload = (rawReply?: string | null): { message: string; proofPhotos: string[] } => {
  if (!rawReply) return { message: '', proofPhotos: [] };
  try {
    const parsed = JSON.parse(rawReply);
    if (parsed && typeof parsed === 'object') {
      const message = typeof parsed.message === 'string' ? parsed.message : rawReply;
      const proofPhotos = Array.isArray(parsed.proofPhotos)
        ? parsed.proofPhotos.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      return { message, proofPhotos };
    }
    return { message: rawReply, proofPhotos: [] };
  } catch {
    return { message: rawReply, proofPhotos: [] };
  }
};

const isAssignmentNotification = (reason?: string | null): boolean =>
  String(reason || '').toLowerCase().includes('assigned to you');

const isReturnPendingNotification = (reason?: string | null, reply?: string | null): boolean => {
  const reasonText = String(reason || '').toLowerCase();
  const replyText = String(reply || '').toLowerCase();
  return reasonText.includes('has been returned by') || replyText.includes('pending confirmation');
};
interface LocationStat {
  location: string;
  count: number;
}

const SupervisorDashboard: React.FC<Props> = ({
  user,
  setUser,
  navigation,
}) => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

  const styles = supervisorStyles({ width, height: useWindowDimensions().height });

  const [metricsData, setMetricsData] = useState({
    totalAssets: 0,
    officeAssets: 0,
    fieldAssets: 0,
  });
  const [supervisorAssignedAssets, setSupervisorAssignedAssets] = useState<any[]>([]);
  const [operatorReplies, setOperatorReplies] = useState<OperatorReply[]>([]);
  const [loading, setLoading] = useState(true); // Added loading state
  const [extendDays, setExtendDays] = useState(3);
  const [fieldLocationStats, setFieldLocationStats] = useState<LocationStat[]>(
    [],
  );

  const [selectedItem, setSelectedItem] = useState<OperatorReply | null>(null);
  const [extendModalVisible, setExtendModalVisible] = useState(false); // Removed duplicate state
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    kind: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', kind: 'info' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSnackbar({ visible: true, message, kind });
    timeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  const metrics = [
    {
      title: 'Total Assets',
      icon: 'albums-outline',
      value: metricsData.totalAssets,
      navigateTo: 'TotalAssetDetails' as keyof SupervisorStackParamList,
    },
    {
      title: 'Assets in Office',
      icon: 'business-outline',
      value: metricsData.officeAssets,
      navigateTo: 'OfficeAssets' as keyof SupervisorStackParamList,
    },
    {
      title: 'Assets in Field',
      icon: 'walk-outline',
      value: metricsData.fieldAssets,
      navigateTo: 'FieldAssets' as keyof SupervisorStackParamList,
    },
  ];

  const fetchDashboardData = async () => {
    if (!user?.employeeId) return;
    try {
      setLoading(true);

      const [metricsRes, repliesRes, assetsRes, supervisorAssetsRes] = await Promise.all([
        axios.get(`${baseURL}/api/dashboard/metrics`),
        axios.get(
          `${baseURL}/api/notifications/supervisor?id=${user?.employeeId}`,
        ),
        axios.get(`${baseURL}/api/assets`),
        axios.get(`${baseURL}/api/supervisor/assets?id=${user?.employeeId}`),
      ]);
      const rawData = Array.isArray(repliesRes.data)
        ? repliesRes.data
        : repliesRes.data.notifications || [];

      const formatted = rawData.map((n: any) => ({
        notificationId: n.notificationId,
        assignmentId: n.assignmentId ? Number(n.assignmentId) : undefined,
        operatorName: n.operatorName || 'Unknown',
        assetName: n.assetName || 'Unknown Asset',
        reason: n.reason,
        reply: n.reply,
        status: n.status,
        senderId: n.senderId ?? n.sender?.employeeId,
        receiverId: n.receiverId ?? n.receiver?.employeeId,
        isAssignment: isAssignmentNotification(n.reason),
      }));
      console.log('Formatted Replies for State:', formatted);

      const assets = assetsRes.data?.assets || assetsRes.data || [];
      const normalizeStatus = (value: unknown) =>
        String(value || '')
          .toLowerCase()
          .replace(/[_\s-]+/g, ' ')
          .trim();

      const locationCounts = assets.reduce(
        (acc: Record<string, number>, asset: any) => {
          const status = normalizeStatus(asset?.status);
          const isFieldAsset = status === 'assigned' || status === 'overdue';
          if (!isFieldAsset) return acc;

          const locationKey =
            (asset?.location || 'Unknown').toString().trim() || 'Unknown';
          acc[locationKey] = (acc[locationKey] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const locationEntries = (
        Object.entries(locationCounts) as [string, number][]
      )
        .sort((a, b) => b[1] - a[1])
        .map(([location, count]) => ({
          location,
          count: Number(count),
        }));

      setMetricsData(metricsRes.data);
      setOperatorReplies(formatted);
      setFieldLocationStats(locationEntries);
      setSupervisorAssignedAssets(
        Array.isArray((supervisorAssetsRes as any)?.data?.assets)
          ? (supervisorAssetsRes as any).data.assets
          : [],
      );
    } catch (error) {
      console.log('Dashboard Data Fetch Error:', error);
      setFieldLocationStats([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDashboardData();
    const loadSubscriptionStatus = async () => {
      const expiredStr = await AsyncStorage.getItem('isSubscriptionExpired');
      if (expiredStr) {
        setIsSubscriptionExpired(JSON.parse(expiredStr));
      }
    };
    loadSubscriptionStatus();
  }, [user?.employeeId]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null); // parent will show AuthStack or login screen
  };

  const openReceiptModal = (item: OperatorReply) => {
    setSelectedItem(item);
    setReceiptModalVisible(true);
  };

  const handleConfirmReceipt = async (reason: string, proofImages?: string[]) => {
    if (!selectedItem || !user?.employeeId) {
      showSnackbar('Missing notification context.', 'error');
      return;
    }

    if (!selectedItem.senderId) {
      showSnackbar('Missing assigner information.', 'error');
      return;
    }

    if (!proofImages || proofImages.length < 4) {
      showSnackbar('Please attach at least 4 proof images.', 'error');
      return;
    }

    try {
      const response = await axios.post(`${baseURL}/api/notifications/reply`, {
        originalNotificationId: Number(selectedItem.notificationId),
        replyMessage: reason,
        senderId: Number(user.employeeId),
        receiverId: Number(selectedItem.senderId),
        proofPhotos: proofImages,
      });

      showSnackbar(response.data.message || 'Receipt confirmed.', 'success');
      setReceiptModalVisible(false);
      setOperatorReplies(prev =>
        prev.map(item =>
          item.notificationId === selectedItem.notificationId
            ? {
                ...item,
                reply: JSON.stringify({ message: reason, proofPhotos: proofImages }),
              }
            : item,
        ),
      );
      fetchDashboardData();
    } catch (err: any) {
      console.error('Receipt confirmation error:', err?.response?.data || err);
      showSnackbar(err?.response?.data?.message || 'Failed to confirm receipt.', 'error');
    }
  };

  const openExtendModal = (item: OperatorReply) => {
    setSelectedItem(item);
    setExtendModalVisible(true);
  };

  const handleConfirmReturn = async (item: OperatorReply) => {
    if (!user?.employeeId) {
      showSnackbar('Missing supervisor context.', 'error');
      return;
    }

    if (!item.assignmentId) {
      showSnackbar('Missing assignment for return confirmation.', 'error');
      return;
    }

    try {
      const response = await axios.post(`${baseURL}/api/assets/confirm-return`, {
        notificationId: Number(item.notificationId),
        assignmentId: Number(item.assignmentId),
        confirmedByEmployeeId: Number(user.employeeId),
      });

      showSnackbar(response.data.message || 'Return confirmed.', 'success');
      setOperatorReplies((prev) => prev.filter((n) => n.notificationId !== item.notificationId));
      fetchDashboardData();
    } catch (error: any) {
      console.error('Confirm return error:', error?.response?.data || error);
      showSnackbar(error?.response?.data?.message || 'Failed to confirm return.', 'error');
    }
  };

  const hideNotification = async (notificationId: number) => {
    try {
      await axios.put(`${baseURL}/api/notifications/hide`, { id: Number(notificationId) });
      setOperatorReplies((prev) =>
        prev.filter((item) => item.notificationId !== notificationId),
      );
      showSnackbar('Notification marked as read.', 'success');
    } catch (error) {
      console.error('Supervisor hide notification error:', error);
      showSnackbar('Failed to mark notification as read.', 'error');
    }
  };

  const handleExtendDate = async (notificationId: number, days: number) => {
    try {
      const response = await axios.post(
        `${baseURL}/api/assets/extend-return-date`,
        {
          notificationId,
          daysToExtend: days,
        },
      );

      showSnackbar(response.data.extensionMessage || 'Return date extended.', 'success');
      setExtendModalVisible(false);

      // Remove from UI immediately
      setOperatorReplies(prev =>
        prev.filter(n => n.notificationId !== notificationId),
      );
    } catch (err: any) {
      console.error('Extend Return Date Error:', err);
      showSnackbar(
        err.response?.data?.message || 'Failed to extend return date.',
        'error',
      );
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={styles.screenScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Header is now separate from the main content container --- */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBg}>
                <Feather name="box" size={24} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>{user?.supervisorName}</Text>
            </View>
            <View style={styles.headerRight}>
              <Feather name="user" size={16} color="#A9C6E4" />
              <Text style={styles.userText}>{user?.fullName}</Text>
              {/* <Switch
              trackColor={{ false: '#E9E9EA', true: '#34C759' }}
              thumbColor="#f4f3f4"
              value={true}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            /> */}

              <Feather
                name="settings"
                size={20}
                color="#A9C6E4"
                style={{ marginLeft: 5 }}
              />

              {/* 🔴 ADD LOGOUT BUTTON HERE */}
              <TouchableOpacity onPress={handleLogout}>
                <Feather
                  name="log-out"
                  size={22}
                  color="#F97373"
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* --- Main content area is now a separate container --- */}

          <View style={styles.container}>
            {/* Metrics */}
            <View
              style={[
                styles.metricsGrid,
                isMobileLayout && { flexDirection: 'column', gap: 10 },
              ]}
            >
              {metrics.map((m, index) => (
                <View style={styles.metricBox}>
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.metricRow,
                      m.title === 'Assets in Field' && styles.metricBoxField,
                      isMobileLayout && { width: '100%' },
                    ]}
                    disabled={!m.navigateTo}
                    onPress={() =>
                      m.navigateTo && navigation.navigate(m.navigateTo as any)
                    }
                  >
                    <Ionicons name={m.icon as any} size={24} color="#22D3EE" />
                    <Text style={styles.metricTitle}>{m.title}</Text>
                  </TouchableOpacity>
                   <Text style={styles.metricValue}>{m.value}</Text>
                  {m.title === 'Assets in Field' && (
                    <View style={styles.locationMiniGrid}>
                      {fieldLocationStats.length === 0 ? (
                        <Text style={styles.locationMiniEmpty}>
                          No location data
                        </Text>
                      ) : (
                        fieldLocationStats.slice(0, 4).map(item => (
                          <View
                          key={item.location}
                          style={styles.locationMiniCell}
                          >
                            <Text
                              style={styles.locationMiniName}
                              numberOfLines={1}
                            >
                              {item.location}
                            </Text>
                            <Text style={styles.locationMiniCount}>
                              {item.count}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                 
                </View>
              ))}
            </View>

            {/* --- Side-by-side content --- */}
            {/* Loading OR Content */}
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#22D3EE"
                style={{ marginTop: 20 }}
              />
            ) : isMobileLayout ? (
              <View style={styles.mobileStack}>
                <View style={styles.mobileBlockTop}>
                  <QuickActionsSection
                    styles={styles}
                    isMobileLayout={isMobileLayout}
                    navigation={navigation}
                    employeeId={user?.employeeId}
                    roleName={user?.roleName}
                    supervisorName={user?.supervisorName}
                    supervisorAssignedAssets={supervisorAssignedAssets}
                    isSubscriptionExpired={isSubscriptionExpired}
                  />
                </View>
                <View style={styles.mobileBlockBottom}>
                  <ActivitySection
                    styles={styles}
                    isMobileLayout={isMobileLayout}
                    operatorReplies={operatorReplies}
                    openExtendModal={openExtendModal}
                    openReceiptModal={openReceiptModal}
                    onConfirmReturn={handleConfirmReturn}
                    hideNotification={hideNotification}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.mainContent}>
                <ActivitySection
                  styles={styles}
                  isMobileLayout={isDesktopWeb}
                  operatorReplies={operatorReplies}
                  openExtendModal={openExtendModal}
                  openReceiptModal={openReceiptModal}
                  onConfirmReturn={handleConfirmReturn}
                  hideNotification={hideNotification}
                />
                <QuickActionsSection
                  styles={styles}
                  isMobileLayout={isDesktopWeb}
                  navigation={navigation}
                  employeeId={user?.employeeId}
                  roleName={user?.roleName}
                  supervisorName={user?.supervisorName}
                  supervisorAssignedAssets={supervisorAssignedAssets}
                  isSubscriptionExpired={isSubscriptionExpired}
                />
              </View>
            )}
          </View>

          {/* Bottom Navigation (desktop only) */}
          {/* {!isMobileLayout && (
            <View style={styles.bottomNav}>
              <View style={styles.bottomNavLeft}>
                <TouchableOpacity style={styles.navItem}>
                  <Ionicons name="grid-outline" size={20} color="#333" />
                  <Text style={styles.navText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                  <Ionicons name="people-outline" size={20} color="#333" />
                  <Text style={styles.navText}>Supervior</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#333"
                  />
                  <Text style={styles.navText}>Reports</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomNavRight}>
                <TouchableOpacity style={styles.navItem}>
                  <MaterialCommunityIcons name="web" size={20} color="#333" />
                  <Text style={styles.navText}>Web</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                  <MaterialCommunityIcons
                    name="cellphone"
                    size={20}
                    color="#333"
                  />
                  <Text style={styles.navText}>iOS</Text>
                </TouchableOpacity>
              </View>
            </View>
          )} */}
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={extendModalVisible}
          onRequestClose={() => setExtendModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Extend Return Date</Text>
              <Text style={styles.modalSubtitle}>
                Asset: {selectedItem?.assetName}
                {'\n'}
                Reason: "{selectedItem?.reply ?? selectedItem?.reason}"
              </Text>

              {/* Dropdown for selecting days (1-10) */}
              <Picker
                selectedValue={extendDays}
                onValueChange={value => setExtendDays(value)}
                style={{ width: '100%', height: 50, color: '#E6F3FF' }}
              >
                {[...Array(10)].map((_, i) => (
                  <Picker.Item key={i} label={`${i + 1} Days`} value={i + 1} />
                ))}
              </Picker>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() =>
                  selectedItem &&
                  handleExtendDate(selectedItem.notificationId, extendDays)
                }
              >
                <Text style={styles.modalButtonText}>
                  Extend by {extendDays} Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setExtendModalVisible(false)}
              >
                <Text style={{ color: '#A9C6E4' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <OverdueNotificationModal
          visible={receiptModalVisible}
          onClose={() => setReceiptModalVisible(false)}
          onSubmit={handleConfirmReceipt}
          assetName={selectedItem?.assetName || 'Asset'}
          title="Confirm Asset Receipt"
          requireProofImages={true}
          minProofImages={4}
        />
        <AppSnackbar
          visible={snackbar.visible}
          message={snackbar.message}
          kind={snackbar.kind}
          onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
          bottom={isMobileLayout ? 16 : 20}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

// Helper Components for cleaner code
const QuickActionsSection = ({
  styles,
  navigation,
  employeeId,
  roleName,
  supervisorName,
  supervisorAssignedAssets,
  isMobileLayout,
  isSubscriptionExpired,
}: any) => (
  <View
    style={[
      styles.actionsSection,
      isMobileLayout
        ? {
            flex: 1,
            minWidth: 'auto',
            minHeight: 'auto',
            marginBottom: 0,
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }
        : { flexBasis: '32%', maxWidth: 360, height: 'auto' },
    ]}
  >
    <Text style={styles.sectionTitle}>Quick Actions</Text>
    
    {!isSubscriptionExpired && (
      <>
        <TouchableOpacity
          style={[styles.actionButton, styles.blueButton]}
          onPress={() => navigation.navigate('AddEditAsset')}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color="#fff"
            style={styles.actionIcon}
          />
          <Text style={styles.actionButtonText}>Add New Asset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('AssignAsset', {
              supervisor_employeeId: employeeId,
              supervisorName: supervisorName,
            })
          }
        >
          <View style={[styles.actionButton, { backgroundColor: '#0F766E' }]}> 
            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color="#fff"
              style={styles.actionIcon}
            />
            <Text style={styles.actionButtonText}>Assign Asset</Text>
          </View>
        </TouchableOpacity>
      </>
    )}
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('FieldAssets', {
          employeeId: String(employeeId || ''),
          operatorName: String(supervisorName || ''),
        })
      }
    >
      <View style={[styles.actionButton, { backgroundColor: '#0369A1' }]}> 
        <Ionicons
          name="list-outline"
          size={20}
          color="#fff"
          style={styles.actionIcon}
        />
        <Text style={styles.actionButtonText}>My Assigned Assets</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('ReturnAsset', {
          assets: supervisorAssignedAssets || [],
          supervisorEmployeeId: String(employeeId || ''),
          returnByRole: 'supervisor',
        })
      }
    >
      <View style={[styles.actionButton, { backgroundColor: '#1E40AF' }]}> 
        <Ionicons
          name="return-up-back-outline"
          size={20}
          color="#fff"
          style={styles.actionIcon}
        />
        <Text style={styles.actionButtonText}>Return Assigned Assets</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('Reports', {
          employeeId: String(employeeId || ''),
          roleName: String(roleName || 'Supervisor'),
        })
      }
    >
      <View style={[styles.actionButton, { backgroundColor: '#4C1D95' }]}> 
        <Ionicons
          name="document-text-outline"
          size={20}
          color="#fff"
          style={styles.actionIcon}
        />
        <Text style={styles.actionButtonText}>View Reports</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const ActivitySection = ({
  styles,
  operatorReplies,
  openExtendModal,
  openReceiptModal,
  onConfirmReturn,
  hideNotification,
  isMobileLayout,
}: any) => (
  <View
    style={[
      styles.activitySection,
      {
        flex: 1,
        marginBottom: 12,
        width: 'auto',
        position: 'relative',
        zIndex: isMobileLayout ? 1 : 0,
      },
    ]}
  >
    <Text style={styles.sectionTitle}>
      Recent Activities and Operator Replies
    </Text>

    {operatorReplies.length === 0 ? (
      <Text style={styles.noItemsText}>No replies yet.</Text>
    ) : (
      <ScrollView
        style={styles.activityListScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        // This ensures the scroll area expands correctly
        contentContainerStyle={styles.activityListContent}
      >
        {operatorReplies.map((item: any) => {
          const hasReply = !!item.reply && item.reply.trim().length > 0;
          const isConfirmed = ['received', 'confirmed'].includes(
            String(item.status || '').toLowerCase(),
          );
          const isReturnPending = isReturnPendingNotification(item.reason, item.reply);

          return (
          <View key={item.notificationId} style={styles.activityItem}>
            <Ionicons name="chatbubbles-outline" size={24} color="#22D3EE" />
            <View style={styles.activityTextContainer}>
              <Text style={styles.activityText}>
                Reply from{' '}
                <Text style={{ fontWeight: 'bold' }}>{item.operatorName}</Text>
              </Text>
              <Text style={[styles.activitySubtext, { textTransform: 'capitalize' }]}>
                Status: {item.status || 'unread'}
              </Text>
              <Text style={styles.activitySubtext}>
                “{parseReplyPayload(item.reply || item.reason).message}”
              </Text>
              {parseReplyPayload(item.reply).proofPhotos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {parseReplyPayload(item.reply).proofPhotos.map((uri, idx) => (
                    <Image
                      key={`supervisor-proof-${item.notificationId}-${idx}`}
                      source={{ uri }}
                      style={{ width: 56, height: 56, borderRadius: 8, marginRight: 8 }}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
            {isConfirmed && !isReturnPending && (
              <TouchableOpacity
                onPress={() => openExtendModal(item)}
                style={styles.extendButton}
              >
                <Text style={styles.extendButtonText}>Extend</Text>
              </TouchableOpacity>
            )}
            {item.isAssignment && !hasReply && !isConfirmed && (
              <TouchableOpacity
                onPress={() => openReceiptModal(item)}
                style={[styles.extendButton, { backgroundColor: '#0F766E', marginLeft: 8 }]}
              >
                <Text style={styles.extendButtonText}>Confirm Receipt</Text>
              </TouchableOpacity>
            )}
            {isReturnPending && (
              <TouchableOpacity
                onPress={() => onConfirmReturn(item)}
                style={[styles.extendButton, { backgroundColor: '#14532D', marginLeft: 8 }]}
              >
                <Text style={styles.extendButtonText}>Confirm Return</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => hideNotification(item.notificationId)}
              style={[styles.extendButton, { backgroundColor: '#334155', marginLeft: 8 }]}
            >
              <Text style={styles.extendButtonText}>Mark as Read</Text>
            </TouchableOpacity>
          </View>
        );})}
      </ScrollView>
    )}
  </View>
);

export default SupervisorDashboard;
