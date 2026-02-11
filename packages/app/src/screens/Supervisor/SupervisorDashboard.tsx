import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView,FlatList, TouchableOpacity, Switch, ImageBackground, Modal, ActivityIndicator, Alert } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { RootStackParamList } from '../../navigation/types';

type DashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SupervisorDashboard'
>;

type DashboardRouteProp = RouteProp<
  RootStackParamList,
  'SupervisorDashboard'
>;

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

interface OperatorReply {
  notificationId: number;
  operatorName: string;
  assetName: string;
  reason : string;
  reply: string;
}

const SupervisorDashboard: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const route = useRoute<DashboardRouteProp>();

  const { supervisorName, roleName, employeeId } = route.params;
   const [metricsData, setMetricsData] = useState({ totalAssets: 0, officeAssets: 0, fieldAssets: 0 });
  const [operatorReplies, setOperatorReplies] = useState<OperatorReply[]>([]);
  const [loading, setLoading] = useState(true); // Added loading state
  const [extendDays, setExtendDays] = useState(3);
  
  const [selectedItem, setSelectedItem] = useState<OperatorReply | null>(null);
  const [extendModalVisible, setExtendModalVisible] = useState(false); // Removed duplicate state

  const metrics = [
    { title: 'Total Assets', icon: 'albums-outline', value: metricsData.totalAssets, navigateTo: 'TotalAssetDetails' as keyof SupervisorStackParamList },
    { title: 'Assets in Office', icon: 'business-outline', value: metricsData.officeAssets, navigateTo: 'OfficeAssets' as keyof SupervisorStackParamList },
    { title: 'Assets in Field', icon: 'walk-outline', value: metricsData.fieldAssets, navigateTo: 'FieldAssets' as keyof SupervisorStackParamList },
  ];

const fetchDashboardData = async () => {
  if (!employeeId) return;
  try {
    setLoading(true);

    const [metricsRes, repliesRes] = await Promise.all([
      axios.get(`http://localhost:3000/api/dashboard/metrics`),
      axios.get(`http://localhost:3000/api/notifications/supervisor?id=${employeeId}`)
    ]);

    // FIX: repliesRes.data IS the array [{}, {}, {}]
    const rawData = Array.isArray(repliesRes.data) 
      ? repliesRes.data 
      : (repliesRes.data.notifications || []);

    const formatted = rawData.map((n: any) => ({
      notificationId: n.notificationId,
      operatorName: n.operatorName || "Unknown",
      assetName: n.assetName || "Unknown Asset",
      reason: n.reason,
      reply: n.reply
    }));

    console.log("Formatted Replies for State:", formatted);
    
    setMetricsData(metricsRes.data);
    setOperatorReplies(formatted);

  } catch (error) {
    console.log('Dashboard Data Fetch Error:', error);
  } finally {
    setLoading(false);
  }
};
  // --- CORRECTED useEffect: Single hook, dependent on employeeId ---
  useEffect(() => {
    fetchDashboardData();
  }, [employeeId]);

  const openExtendModal = (item: OperatorReply) => {
    setSelectedItem(item);
    setExtendModalVisible(true);
  };
  
  const handleExtendDate = async (notificationId: number, days: number) => {
  try {
    const response = await axios.post(`http://localhost:3000/api/assets/extend-return-date`, { 
      notificationId,
      daysToExtend : days
    });

    Alert.alert("Success", response.data.extensionMessage);
    setExtendModalVisible(false);

    // Remove from UI immediately
    setOperatorReplies(prev => prev.filter(n => n.notificationId !== notificationId));

  } catch (err: any) {
    console.error("Extend Return Date Error:", err);
    Alert.alert("Error", err.response?.data?.message || "Failed to extend return date.");
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
        {/* --- Header is now separate from the main content container --- */}
        <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBg}>
                <Feather name="box" size={24} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>{supervisorName}</Text>
            </View>
            <View style={styles.headerRight}>
            <Feather name="user" size={16} color="#333" />
            <Text style={styles.userText}>{roleName}</Text>
            {/* <Switch
              trackColor={{ false: '#E9E9EA', true: '#34C759' }}
              thumbColor="#f4f3f4"
              value={true}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            /> */}

            <Feather name="settings" size={20} color="#333" style={{ marginLeft: 5 }} />

            {/* 🔴 ADD LOGOUT BUTTON HERE */}
            <TouchableOpacity onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "CompanyLogin" }],
              })
            }
            >
              <Feather name="log-out" size={22} color="red" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Main content area is now a separate container --- */}
        <View style={styles.container}>
            {/* Metrics */}
            <View style={styles.metricsGrid}>
                {metrics.map((m, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.metricBox}
                        disabled={!m.navigateTo}
                        onPress={() => m.navigateTo && navigation.navigate(m.navigateTo as any)}
                    >
                        <Ionicons name={m.icon as any} size={24} color="#1A202C" />
                        <Text style={styles.metricTitle}>{m.title}</Text>
                        <Text style={styles.metricValue}>{m.value}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* --- Side-by-side content --- */}
            <View style={styles.mainContent}>
                <View style={styles.activitySection}>
                    <Text style={styles.sectionTitle}>Recent Activities and Operator Replies</Text>
                    {operatorReplies.length === 0 ? (
                        <Text style={styles.noItemsText}>No replies yet.</Text>
                    ) : (
                        <FlatList
                            data={operatorReplies}
                            keyExtractor={(item) => item.notificationId.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.activityItem}>
                                    <Ionicons name="chatbubbles-outline" size={24} color="#4A55A2" />
                                    <View style={styles.activityTextContainer}>
                                        <Text style={styles.activityText}>Reply from <Text style={{fontWeight: 'bold'}}>{item.operatorName}</Text> regarding <Text style={{fontWeight: 'bold'}}>{item.assetName}</Text></Text>
                                        <Text style={styles.activitySubtext}>“{item.reply ? item.reply : item.reason}”</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => openExtendModal(item)} style={styles.extendButton}>
                                        <Text style={styles.extendButtonText}>Extend</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                </View>

                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <TouchableOpacity style={[styles.actionButton, styles.blueButton]} onPress={() => navigation.navigate('AddEditAsset')}>
                        <Text style={styles.actionButtonText}>Add New Asset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.whiteButton]}>
                        <Text style={[styles.actionButtonText, styles.whiteButtonText]}>Scan Barcode</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('AssignAsset', { supervisor_employeeId: employeeId, supervisorName: supervisorName })}>
                        <View style={[styles.actionButton, { backgroundColor: '#32C8A4' }]}>
                            <Text style={styles.actionButtonText}>Assign/Return Asset</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>

        {/* Bottom Navigation */}
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
              <Ionicons name="document-text-outline" size={20} color="#333" />
              <Text style={styles.navText}>Reports</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomNavRight}>
            <TouchableOpacity style={styles.navItem}>
              <MaterialCommunityIcons name="web" size={20} color="#333" />
              <Text style={styles.navText}>Web</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <MaterialCommunityIcons name="cellphone" size={20} color="#333" />
              <Text style={styles.navText}>iOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
              animationType="fade"
              transparent={true}
              visible={extendModalVisible}
              onRequestClose={() => setExtendModalVisible(false)}>
          <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
      
              <Text style={styles.modalTitle}>Extend Return Date</Text>
              <Text style={styles.modalSubtitle}>
                  Asset: {selectedItem?.assetName}{"\n"}
                  Reason: "{selectedItem?.reply ?? selectedItem?.reason}"
              </Text>

      {/* Dropdown for selecting days (1-10) */}
          <Picker
              selectedValue={extendDays}
              onValueChange={(value) => setExtendDays(value)}
              style={{ width: "100%", height: 50 }}>
              {[...Array(10)].map((_, i) => (
                <Picker.Item key={i} label={`${i + 1} Days`} value={i + 1} />
            ))}
          </Picker>

      {/* Submit Button */}
          <TouchableOpacity
              style={styles.modalButton}
              onPress={() => selectedItem && handleExtendDate(selectedItem.notificationId, extendDays)}>
              <Text style={styles.modalButtonText}>Extend by {extendDays} Days</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalCancel} onPress={() => setExtendModalVisible(false)}>
              <Text style={{ color: '#555' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
</ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
   flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: { flex: 1 ,backgroundColor:"rgba(61, 138, 233, 0.52)",},
  container: { flex: 1 ,padding: 20,
    gap: 20,},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    paddingTop: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
 headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoBg: { backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: 8, borderRadius: 10, marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000000ff' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
  },
  userText: { marginLeft: 8, marginRight: 8, fontSize: 14, fontWeight: '500', color: '#333' },
  metricsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  metricTitle: { fontSize: 14, color: '#1A202C', fontWeight: '500', marginTop: 8 },
  metricValue: { fontSize: 32, fontWeight: 'bold', color: '#1A202C', marginTop: 4 },
  
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  activitySection: {
    flex: 2.5, // Takes more space
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 15,
    padding: 20,
  },
  actionsSection: {
    flex: 1, // Takes less space
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#000000ff' },
  noItemsText: { color: 'rgba(0, 0, 0, 0.8)', fontStyle: 'italic' },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(230, 235, 255, 0.8)',
    padding: 12,
    borderRadius: 10,
  },
  activityTextContainer: { flex: 1, marginLeft: 15 },
  activityText: { fontSize: 14, fontWeight: '500', color: '#2D3748' },
  activitySubtext: { fontSize: 15, color: '#1A202C', fontWeight: '600', fontStyle: 'italic', marginTop: 3 },
  extendButton: { backgroundColor: '#4A90E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  extendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  actionButton: { padding: 15, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  blueButton: { backgroundColor: '#4A90E2' },
  whiteButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  whiteButtonText: { color: '#4A90E2' },
  
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10, // Added margin at the bottom
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  bottomNavLeft: { flexDirection: 'row', alignItems: 'center' },
  bottomNavRight: { flexDirection: 'row', alignItems: 'center' },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  navText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#1A202C' },
  
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalBox: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 20 },
  modalButton: { width: '100%', backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center' },
  modalButtonText: { color: '#000000ff', fontSize: 16, fontWeight: 'bold' },
  modalCancel: { marginTop: 15, padding: 10 },
});

export default SupervisorDashboard;