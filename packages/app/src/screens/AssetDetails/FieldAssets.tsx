import React, { useState,useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';

import { Ionicons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";
import { Asset,baseURL, RootStackParamList } from '../../navigation/types';
import AsyncStorage from "@react-native-async-storage/async-storage";

type FieldAssetsNavProp = StackNavigationProp<RootStackParamList, 'FieldAssets'>;

const FieldAssets: React.FC = () => {
  const navigation = useNavigation<FieldAssetsNavProp>();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]); // 🔥 For search filtering
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 🔥 Corrected Overdue Logic (Moved outside or kept once)
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
 /* 🔹 Load logged-in supervisor */
    useEffect(() => {
        const loadUser = async () => {
            const user = await AsyncStorage.getItem("user");
            if (user) {
                const parsed = JSON.parse(user);
                setAdminId(Number(parsed.employeeId));
            }
        };
        loadUser();
    }, []);
  // 2. 🔥 Fetch assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/assets`);
      const data = response.data;

      const processed = (data.assets || [])
        .map((asset: Asset) => {
          const overdue = isAssetOverdue(asset.expectedReturnDate);
          return {
            ...asset,
            // Override status if assigned but date is past
            status: (asset.status === "Assigned" && overdue) ? "Overdue" : asset.status
          };
        })
        .filter((asset: Asset) => 
          asset.status === "Assigned" || asset.status === "Overdue"
        );

      setAssets(processed);
      setFilteredAssets(processed);
    } catch (err) {
      console.error("Error fetching assets:", err);
      Alert.alert("Error", "Failed to fetch assets.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
    }, [])
  );

  // 3. 🔥 Search Logic
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredAssets(assets);
      return;
    }
    const query = text.toLowerCase();
    const filtered = assets.filter(a => 
      a.assetName?.toLowerCase().includes(query) || 
      a.barcode?.toLowerCase().includes(query) ||
      a.assignedTo?.toLowerCase().includes(query)
    );
    setFilteredAssets(filtered);
  };

  const handleOpenModal = (asset: Asset) => {
          setSelectedAsset(asset);
          setModalVisible(true);
      };
      const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedAsset(null);
    };
 /* 🔹 Send notification */
    const handleSubmitNotification = async (reason: string) => {
        if (!selectedAsset) return;

        try {
            const payload = {
                // ✅ MATCHING YOUR BACKEND supervisor.ts NAMES:
                assetId: Number(selectedAsset.id),
                assignmentId: selectedAsset.assignmentId ? Number(selectedAsset.assignmentId) : null,
                operatorId: Number(selectedAsset.senderId || adminId), // The Supervisor sending it
                receiverId: Number(selectedAsset.receiverId || selectedAsset.operatorId), // The Operator receiving it
                reason: reason,
            };

            console.log("SENDING CORRECTED PAYLOAD:", payload);

            const response = await axios.post(
                `${baseURL}/api/notifications/supervisor`,
                payload
            );

            if (response.status === 200 || response.status === 201) {
                Alert.alert("Success", "Notification sent successfully!");
                handleCloseModal();
                fetchAssets();
            }
        } catch (error: any) {
            console.error("API Error:", error.response?.data || error.message);
            Alert.alert("Error", error.response?.data?.message || "Failed to send notification");
        }
    };
  
  const renderAsset = ({ item }: { item: Asset }) => {
    const isOverdue = item.status?.toLowerCase() === 'overdue';

    return (
      <View style={styles.assetRow}>
        <Ionicons name="business-outline" size={24} color="#3B59B8" style={styles.assetIcon} />
        <View style={styles.assetInfo}>
          <Text style={styles.assetName}>{item.assetName} ({item.barcode})</Text>
          <Text style={styles.assetSubtext}>Last User: {item.assignedTo || "N/A"}</Text>
          {item.expectedReturnDate && (
            <Text style={styles.assetSubtext}>
              Expected Return: {new Date(item.expectedReturnDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'Asia/Kolkata' // 🔥 Forces display in IST
              })}
            </Text>
          )}
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>OVERDUE</Text>
            </View>
          )}
        </View>

        {isOverdue && (
            <TouchableOpacity
                                                          style={[styles.actionButton, styles.notifyButton]}
                                                          onPress={() => handleOpenModal(item)}
                                                      >
                                                          <Ionicons name="notifications" size={16} color="#fff" />
                                                          <Text style={styles.actionButtonText}>Notify</Text>
                                                      </TouchableOpacity>
        )}
      </View>
    );
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
          <View style={styles.header}>
                               <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                   <Ionicons name="arrow-back-outline" size={24} color="#fff" />
                               </TouchableOpacity>
                               <Text style={styles.headerTitle}>Field Assets</Text>
                               <View style={{width: 40}} />
                           </View>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name, user, or barcode..."
              placeholderTextColor="#888"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <FlatList
            data={filteredAssets}
            renderItem={renderAsset}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchAssets}
            ListEmptyComponent={<Text style={styles.emptyText}>No assets found in the field.</Text>}
          />
        

         {selectedAsset && (
                    <OverdueNotificationModal
                        visible={isModalVisible}
                        onClose={handleCloseModal}
                        onSubmit={handleSubmitNotification}
                        assetName={selectedAsset.assetName}
                    />
                )}
                 </View> 
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
        flex: 1,
        width: '100%',
        // Redundant but safe, ensures content is centered
        justifyContent: 'center',
        alignItems: 'center',
    },
  container: {
        width: '90%',
         maxWidth: 1100,
        height: '90%',
        backgroundColor: '#F3F4F8', // Solid light background
        borderRadius: 25,
        overflow: 'hidden',
        // Softer shadow to match the image
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
  header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(60, 60, 80, 0.6)',
        padding: 15,
    },
  backButton: {
    padding: 5,
  },

   headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
  searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 10,
        paddingHorizontal: 15,
    },
  searchIcon: {
        marginRight: 10,
    },

   searchInput: {
        flex: 1,
        height: 45,
        fontSize: 15,
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 6, // Smaller padding
        paddingHorizontal: 10, // Smaller padding
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    notifyButton: {
        backgroundColor: '#FF4D4D',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    assetIcon: {
        marginRight: 15,
    },
    assetInfo: {
        flex: 1,
    },
    assetName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    assetSubtext: {
        fontSize: 13,
        color: '#777',
        marginTop: 2,
    },
    assetValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3B59B8',
    },
  overdueBadge: {
    marginTop: 5,
    backgroundColor: "#ff4d4d",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },

  overdueText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  notifyBtn: {
    backgroundColor: "#3B59B8",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  notifyText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 100, // Pushes it down so it's not hidden behind the search bar
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default FieldAssets;
