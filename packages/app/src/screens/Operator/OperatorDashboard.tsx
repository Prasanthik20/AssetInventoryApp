import React, { useEffect,useState, useCallback  } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  Alert,
  Switch,
  FlatList,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, useFocusEffect  } from "@react-navigation/native";
import axios from "axios";
import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';

type DashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OperatorDashboard'
>;

type DashboardRouteProp = RouteProp<
  RootStackParamList,
  'OperatorDashboard'
>;

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
  receiver : {
    employeeId: number;
    name: string;
  }
}

const OperatorDashboard: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const route = useRoute<DashboardRouteProp>();

  // ----------------------------
  // 🔹 Get operator data
  // ----------------------------
  const { operatorName, roleName, employeeId } = route.params;
  const [overdueCount, setOverdueCount] = useState(0);

  // ----------------------------
  // 🔹 Backend Data States
  // ----------------------------
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]); 
  const [assignedCount, setAssignedCount] = useState(0);
  const [currentLocation, setCurrentLocation] = useState("N/A");

  const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
    title: string;
    assetName: string;
    onSubmit: (reason: string) => void;
  }>({
    title: "",
    assetName: "",
    onSubmit: () => {},
  });

  // ----------------------------
  // 🔹 Fetch operator assets
  // ----------------------------
  const fetchOperatorData = async () => {
    if (!employeeId) return;
    try {
      const [assetsRes, notificationsRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/operator/assets?operatorId=${employeeId}`),
        axios.get(`http://localhost:3000/api/notifications/operator?id=${employeeId}`)]);
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
            assetId: id
          });
        }
      });
      const normalizedAssets = Array.from(uniqueAssetsMap.values());
      const overdueAssets = normalizedAssets.filter((a: any) => isAssetOverdue(a.expectedReturnDate));
      setMyAssets(normalizedAssets);
      setOverdueCount(overdueAssets.length);
      setAssignedCount(normalizedAssets.length);
      setCurrentLocation(assetsRes.data.location || "N/A");
      const mappedNotifications = (notificationsRes.data.notifications || [])
        .map((n: any) => ({
          id: n.id,
          reason: n.reason,
          status: n.status, // Ensure status is mapped
          reply: n.reply,
          createdAt: n.created_at,
          asset: {
            id: n.assetId,
            name: n.assetName || (n.asset ? n.asset.name : "Unknown Asset")
          },
          sender: {
            employeeId: n.senderId || n.sender?.employeeId,
            name: n.senderName || (n.sender ? n.sender.fullName : "Supervisor")
          },
          receiver: {
            employeeId: n.receiverId || n.receiver?.employeeId,
            name: n.receiverName || (n.receiver ? n.receiver.fullName : "Operator")
          },
        })) // End of .map()
        .filter((n: any) => n.status !== 'resolved'); // 🔥 Correct placement: Filter the resulting array

      setNotifications(mappedNotifications);
    } catch (err) {
      console.log("Operator Assets API Error:", err);
    }
  };

  useEffect(() => {
  if (route.params?.refresh) {
    console.log("🔄 Return detected, refreshing dashboard data...");
    fetchOperatorData();
    
    // Clear the refresh param so it doesn't loop
    navigation.setParams({ refresh: undefined } as any);
  }
}, [route.params?.refresh]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshData = async () => {
        if (employeeId && isActive) {
          await fetchOperatorData();
        }
      };

      refreshData();

      return () => {
        isActive = false;
      };
    }, [employeeId]) // This is correct, but ensure fetchOperatorData is fresh
  );

  // ----------------------------
  // 🔹 Modal Handlers
  // ----------------------------
  const handleOpenModal = (config: { title: string, assetName: string, onSubmit: (reason: string) => void }) => {
    setModalConfig(config);
    setModalVisible(true);
  };

  const handleCloseModal = () => setModalVisible(false);

  // Update the signature to accept the asset object
  const handleOverdueSubmit = async (reason: string, selectedAsset?: any) => {
    // Use either the passed asset or find it by name as a fallback
    console.log("Submitting for asset:", modalConfig.assetName);
    const asset = selectedAsset || myAssets.find(a => a.assetName === modalConfig.assetName);

    if (!asset || (!asset.assignedBy && !asset.assigned_by)) {
      console.error("Missing Supervisor ID. Asset data:", asset);
      console.error("Critical: No asset context found for submission");
      Alert.alert("Error", "Could not identify which asset to update.");
      return;
    }

    try {
      const payload = {
        assetId: asset.assetId,
        assignmentId: asset.assignmentId || null,
        operatorId: Number(employeeId),
        supervisorId: asset.assignedBy || asset.assigned_by,
        reason: reason
      };
      console.log("DEBUG PAYLOAD:", payload);
      console.log("🚀 Sending notification for:", asset.assetName);

      const response = await axios.post("http://localhost:3000/api/notifications/overdue", payload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

    if (response.status === 200) {
      Alert.alert("Success", "Extension request sent to your supervisor.");
      handleCloseModal();
      fetchOperatorData(); // Refresh to ensure synchronization
    }
  } catch (error: any) {
    console.error("Overdue send error:", error.response?.data || error.message);
    Alert.alert("Error", "Failed to reach server.");
  }
};

const handleReplySubmit = async (replyMessage: string, notification: Notification) => {
  // The 'sender' of the original alert is the 'receiver' of this reply
  const supervisorId = notification.sender?.employeeId; 
  const operatorId = employeeId; // Current logged-in user

  if (!supervisorId || !operatorId) {
    Alert.alert("Error", "Required user information is missing. Please refresh.");
    console.error("IDs missing:", { supervisorId, operatorId });
    return;
  }

  try {
    const payload = {
      originalNotificationId: Number(notification.id),
      replyMessage,
      senderId: Number(operatorId),      // Operator sending the reply
      receiverId: Number(supervisorId),  // Supervisor receiving the reply
      status: 'replied'                  // New status
    };

    await axios.post(`http://localhost:3000/api/notifications/reply`, payload);
// 🔥 Remove the replied notification from the UI list immediately
    setNotifications(prev => prev.filter(item => item.id !== notification.id));
    Alert.alert("Success", "Reply sent successfully!");
    handleCloseModal();
    fetchOperatorData(); // Refresh to see the status change
  } catch (error: any) {
    console.error("Reply Error:", error.response?.data || error.message);
    Alert.alert("Error", "Could not send reply. Check server logs.");
  }
};

  // 🔥 Enhanced check to ensure we don't mark items as overdue if they are returned
 const isAssetOverdue = (expectedReturnDate?: string | null) => {
  if (!expectedReturnDate) return false;

  // 🇮🇳 Get current time in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istToday = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  istToday.setHours(0, 0, 0, 0);

  // 📅 Parse the return date
  const returnDate = new Date(expectedReturnDate);
  const istReturnDate = new Date(returnDate.getTime() + (returnDate.getTimezoneOffset() * 60000) + istOffset);
  istReturnDate.setHours(0, 0, 0, 0);

  // If the return date is strictly before today's date in IST, it is overdue
  return istReturnDate < istToday;
};

 // EXTENDED DATE FIX
const getUpdatedReturnDate = (assetId: number) => {
  const n = notifications.find(
    (x) =>
      x.asset.id === assetId &&
      (x.reason?.toLowerCase().includes("extended") ||
        x.reply?.toLowerCase().includes("extended"))
  );

  if (!n) return null;

  const match = (n.reply || n.reason).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
};

 return (
    <ImageBackground
      source={require("../../assets/Company-bg.webp")}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <LinearGradient
            colors={["rgba(93, 113, 200, 0.7)", "rgba(59, 89, 184, 0.8)"]}
            style={styles.leftPanel}
          >
            <Image source={{ uri: "https://i.imgur.com/gYf2xmm.png" }} style={styles.leftPanelImage} />
            <Text style={styles.leftPanelTitle}>YOUR ASSIGNED{"\n"}EQUIPMENT</Text>
            <Text style={styles.leftPanelSubtitle}>ASSETFLOW PRO</Text>
          </LinearGradient>

          <ScrollView style={styles.rightPanel} contentContainerStyle={{ paddingBottom: 50 }}>
            {/* HEADER */}
           <View style={styles.header}>
             <Text style={styles.headerTitle}>{operatorName}</Text>

             <View style={styles.headerRight}>
               <Feather name="user" size={16} color="#333" />
               <Text style={styles.userText}>{roleName}</Text>

               <TouchableOpacity onPress={() => {
                 setNotifications([]); // 🔥 Clear local notifications state
                 setMyAssets([]);      // 🔥 Clear assets state
                 navigation.reset({
                   index: 0,
                   routes: [{ name: "CompanyLogin" }],
                 })
               }}
               >
                 <Feather name="log-out" size={22} color="red" style={{ marginLeft: 10 }} />
               </TouchableOpacity>
             </View>
           </View>

            {/* METRICS */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <View style={styles.metricIconBg}>
                  <Ionicons name="construct-outline" size={20} color="#3B59B8" />
                </View>
                <Text style={styles.metricTitle}>Assigned Assets</Text>
                <Text style={styles.metricValue}>{assignedCount}</Text>
              </View>

              <View style={styles.metricBox}>
                <View style={styles.metricIconBg}>
                  <Feather name="map-pin" size={18} color="#3B59B8" />
                </View>
                <Text style={styles.metricTitle}>Current Location</Text>
                <Text style={[styles.metricValue, { fontSize: 16 }]}>{currentLocation}</Text>
              </View>
            </View>

            {/* NOTIFICATIONS */}
            <View style={styles.assetsSection}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              {notifications.length === 0 ? (
                <Text style={styles.noItemsText}>No new notifications.</Text>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => {
                    const isFromSupervisor = String(item.sender.employeeId) !== String(employeeId);
                    const isResolved = item.status === 'resolved';

                   return (
                     <View style={[
                       styles.notificationItem,
                       isFromSupervisor ? { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 } : {},
                       isResolved && { opacity: 0.5, backgroundColor: '#f5f5f5' }
                     ]}>
                       <Ionicons
                         name={isResolved ? "checkmark-done-circle" : (isFromSupervisor ? "checkmark-circle-outline" : "notifications-outline")}
                         size={24}
                         color={isResolved ? "#999" : (isFromSupervisor ? "#0284c7" : "#4A55A2")}
                       />
                        <View style={styles.notificationContent}>
                          <Text style={[styles.notificationText, isResolved && { color: '#999' }]}>
                           {isFromSupervisor ? (
                             <Text style={{ color: '#0369a1', fontWeight: 'bold' }}>Update from {item.sender.name}:</Text>
                           ) : (
                             <Text>From <Text style={{ fontWeight: 'bold' }}>{item.sender.name}</Text>:</Text>
                           )}
                         </Text>
                         <Text style={[styles.notificationReason, isResolved && { color: '#999', fontStyle: 'italic' }]}>
                           "{item.reply || item.reason}"
                         </Text>
                       </View>

                        {!isFromSupervisor && !item.reply && !isResolved && (
                          <TouchableOpacity
                            style={styles.replyButton}
                            onPress={() =>
                              handleOpenModal({
                                title: `Reply to ${item.sender.name}`,
                                assetName: item.asset.name,
                                onSubmit: (replyMessage) => handleReplySubmit(replyMessage, item),
                              })
                            }
                          >
                            <Text style={styles.replyButtonText}>Reply</Text>
                          </TouchableOpacity>
                        )}
                        
                      </View>
                    );
                  }}
                />
              )}
            </View>

            {/* ASSETS LIST */}
            <View style={styles.assetsSection}>
              <Text style={styles.sectionTitle}>My Assets</Text>
              {myAssets.length === 0 ? (
                <Text style={{ color: "#333", marginTop: 10 }}>No assets assigned.</Text>
              ) : (
                 myAssets.map((asset, index) => {
                   const updatedReturnDate = getUpdatedReturnDate(asset.assetId);
                   const rawDate = updatedReturnDate || asset.expectedReturnDate;

                   // 🔥 IST Consistent Formatting
                   const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', {
                     day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
                   }) : "No due date";
                  const isOverdue = rawDate && isAssetOverdue(rawDate);
                  const isExtended = Boolean(updatedReturnDate);

                  return (
                    <View style={styles.assetItem} key={index}>
                      <View style={styles.assetIconBg}>
                        <Ionicons name="cube-outline" size={20} color="#3B59B8" />
                      </View>

                      <View style={styles.assetNameContainer}>
                        <Text style={styles.assetName}>
                          {asset.assetName} ({asset.barcode})
                        </Text>
                      </View>

                      <View style={styles.dueDateContainer}>
                        <Text style={[
                          styles.assetDueDate,
                          isOverdue ? { color: "red", fontWeight: "bold" } : (isExtended ? { color: "green", fontWeight: "bold" } : {})
                        ]}>
                          {isOverdue ? "OVERDUE" : formattedDate}
                        </Text>

                        {isOverdue && (
                          <TouchableOpacity
                            style={styles.notifyButton}
                            onPress={() => {
                              console.log("Opening modal for:", asset.assetName);
                              handleOpenModal({
                                title: "Extension Request",
                                assetName: asset.assetName, // ✅ FIXED
                                onSubmit: (reason) => handleOverdueSubmit(reason, asset),
                              });
                            }}
                          >
                            <Text style={styles.notifyButtonText}>Update</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* RETURN BUTTON */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ReturnAsset", {
                  assets: myAssets,
                  operatorEmployeeId: employeeId,
                })
              }
            >
              <LinearGradient
                colors={["#27B2C3", "#40D69B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.returnButton}
              >
                <Text style={styles.returnButtonText}>RETURN ASSET</Text>
              </LinearGradient>
            </TouchableOpacity>
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

const styles = StyleSheet.create({

   backgroundImage: {
    flex: 1,  
    width: '100%',
    height: '100%',
  },
    safeArea: {
        flex: 1,
        backgroundColor:"rgba(61, 138, 233, 0.52)",
    },
  assetNameContainer: { flex: 1 },
  dueDateContainer: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  overdueText: { color: "#DC3545", fontWeight: "bold" },
  notifyButton: {
    marginLeft: 10,
    backgroundColor: "#DC3545",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  notifyButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  container: { flex: 1, flexDirection: "row" },
  leftPanel: { width: "40%", justifyContent: "center", alignItems: "center", padding: 30 },
  leftPanelImage: { width: 200, height: 200, resizeMode: "contain", marginBottom: 30 },
  leftPanelTitle: { fontSize: 32, fontWeight: "bold", color: "#fff", textAlign: "center", lineHeight: 40 },
  leftPanelSubtitle: { fontSize: 16, color: "#E0E0FF", marginTop: 10, opacity: 0.8 },

  rightPanel: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    padding: 25,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#000000ff" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  userText: { marginLeft: 8, marginRight: 8, fontSize: 14, fontWeight: "500", color: "#333" },

  metricsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  metricBox: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 15,
    padding: 20,
  },
  metricIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(59,89,184,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  metricTitle: { fontSize: 14, color: "#4A5568", fontWeight: "500" },
  metricValue: { fontSize: 32, fontWeight: "bold", color: "#1A202C", marginTop: 5 },

  assetsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 15 },

  assetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },

  assetIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  assetName: { fontSize: 15, fontWeight: "600", color: "#2D3748" },
  assetDueDate: { fontSize: 14, color: "#4A5568", fontWeight: "500" },

  returnButton: {
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  returnButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
   noItemsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 10,
    fontStyle: 'italic',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 235, 255, 0.8)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 15,
  },
  notificationText: {
    fontSize: 14,
    color: '#4A5568',
  },
  notificationReason: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    marginTop: 4,
  },
  replyButton: {
    backgroundColor: '#4A55A2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  replyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default OperatorDashboard;