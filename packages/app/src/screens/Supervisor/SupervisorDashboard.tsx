import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  Switch,
  ImageBackground,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, Route, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { baseURL, RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supervisorStyles } from './supervisor.styles';

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
  operatorName: string;
  assetName: string;
  reason: string;
  reply: string;
}

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
  const [operatorReplies, setOperatorReplies] = useState<OperatorReply[]>([]);
  const [loading, setLoading] = useState(true); // Added loading state
  const [extendDays, setExtendDays] = useState(3);
  const [fieldLocationStats, setFieldLocationStats] = useState<LocationStat[]>(
    [],
  );

  const [selectedItem, setSelectedItem] = useState<OperatorReply | null>(null);
  const [extendModalVisible, setExtendModalVisible] = useState(false); // Removed duplicate state

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

      const [metricsRes, repliesRes, assetsRes] = await Promise.all([
        axios.get(`${baseURL}/api/dashboard/metrics`),
        axios.get(
          `${baseURL}/api/notifications/supervisor?id=${user?.employeeId}`,
        ),
        axios.get(`${baseURL}/api/assets`),
      ]);
      const rawData = Array.isArray(repliesRes.data)
        ? repliesRes.data
        : repliesRes.data.notifications || [];

      const formatted = rawData.map((n: any) => ({
        notificationId: n.notificationId,
        operatorName: n.operatorName || 'Unknown',
        assetName: n.assetName || 'Unknown Asset',
        reason: n.reason,
        reply: n.reply,
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
    } catch (error) {
      console.log('Dashboard Data Fetch Error:', error);
      setFieldLocationStats([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDashboardData();
  }, [user?.employeeId]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null); // parent will show AuthStack or login screen
  };

  const openExtendModal = (item: OperatorReply) => {
    setSelectedItem(item);
    setExtendModalVisible(true);
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

      Alert.alert('Success', response.data.extensionMessage);
      setExtendModalVisible(false);

      // Remove from UI immediately
      setOperatorReplies(prev =>
        prev.filter(n => n.notificationId !== notificationId),
      );
    } catch (err: any) {
      console.error('Extend Return Date Error:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to extend return date.',
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
              <Feather name="user" size={16} color="#333" />
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
                color="#333"
                style={{ marginLeft: 5 }}
              />

              {/* 🔴 ADD LOGOUT BUTTON HERE */}
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
                    <Ionicons name={m.icon as any} size={24} color="#1A202C" />
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
                color="#4A55A2"
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
                    supervisorName={user?.supervisorName}
                  />
                </View>
                <View style={styles.mobileBlockBottom}>
                  <ActivitySection
                    styles={styles}
                    isMobileLayout={isMobileLayout}
                    operatorReplies={operatorReplies}
                    openExtendModal={openExtendModal}
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
                />
                <QuickActionsSection
                  styles={styles}
                  isMobileLayout={isDesktopWeb}
                  navigation={navigation}
                  employeeId={user?.employeeId}
                  supervisorName={user?.supervisorName}
                />
              </View>
            )}
          </View>

          {/* Bottom Navigation (desktop only) */}
          {!isMobileLayout && (
            <View style={styles.bottomNav}>
              <View style={styles.bottomNavLeft}>
                <TouchableOpacity style={styles.navItem}>
                  <Ionicons name="grid-outline" size={20} color="#333" />
                  <Text style={styles.navText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                  <Ionicons name="people-outline" size={20} color="#333" />
                  <Text style={styles.navText}>Operators</Text>
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
          )}
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
                style={{ width: '100%', height: 50 }}
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
                <Text style={{ color: '#555' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
};

// Helper Components for cleaner code
const QuickActionsSection = ({
  styles,
  navigation,
  employeeId,
  supervisorName,
  isMobileLayout,
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
      <View style={[styles.actionButton, { backgroundColor: '#32C8A4' }]}>
        <Ionicons
          name="swap-horizontal-outline"
          size={20}
          color="#fff"
          style={styles.actionIcon}
        />
        <Text style={styles.actionButtonText}>Assign Asset</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const ActivitySection = ({
  styles,
  operatorReplies,
  openExtendModal,
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
        showsVerticalScrollIndicator={false}
        // This ensures the scroll area expands correctly
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {operatorReplies.map((item: any) => (
          <View key={item.notificationId} style={styles.activityItem}>
            <Ionicons name="chatbubbles-outline" size={24} color="#4A55A2" />
            <View style={styles.activityTextContainer}>
              <Text style={styles.activityText}>
                Reply from{' '}
                <Text style={{ fontWeight: 'bold' }}>{item.operatorName}</Text>
              </Text>
              <Text style={styles.activitySubtext}>
                “{item.reply || item.reason}”
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openExtendModal(item)}
              style={styles.extendButton}
            >
              <Text style={styles.extendButtonText}>Extend</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    )}
  </View>
);

export default SupervisorDashboard;
