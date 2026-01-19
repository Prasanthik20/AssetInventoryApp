import React, { useState, useCallback } from 'react';
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
import { Asset, RootStackParamList } from '../../navigation/types';

type FieldAssetsNavProp = StackNavigationProp<RootStackParamList, 'FieldAssets'>;

const FieldAssets: React.FC = () => {
  const navigation = useNavigation<FieldAssetsNavProp>();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]); // 🔥 For search filtering
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
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

  // 2. 🔥 Fetch assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/assets');
      const data = await res.json();

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

  const openOverdueModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setModalVisible(true);
  };

  const sendNotification = async (assetId: string, reason: string) => {
    try {
      await axios.post('http://localhost:3000/api/notifications/overdue-assets', {
        assetId: assetId,
        assignmentId: selectedAsset?.assignmentId ?? null,
        senderId: selectedAsset?.senderId ?? null,
        receiverId: selectedAsset?.operatorId ?? null,
        reason,
      });
      Alert.alert("Success", "Operator notified successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not send notification");
    }
  };

  const renderAsset = ({ item }: { item: Asset }) => {
    const showOverdueUI = item.status === "Overdue";

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
          {showOverdueUI && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>OVERDUE</Text>
            </View>
          )}
        </View>

        {showOverdueUI && (
          <TouchableOpacity onPress={() => openOverdueModal(item)} style={styles.notifyBtn}>
            <Text style={styles.notifyText}>Notify</Text>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Field Assets</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.container}>
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
        </View>

        <OverdueNotificationModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedAsset(null);
          }}
          onSubmit={(reason) => {
            if (selectedAsset) sendNotification(selectedAsset.id.toString(), reason);
            setModalVisible(false);
            setSelectedAsset(null);
          }}
          assetName={selectedAsset?.assetName ?? ''}
          title="Notify Operator" // Changed title to reflect Supervisor -> Operator flow
        />
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

  safeArea: {
    flex: 1,
    width: "100%",
  },

  container: {
    width: "90%",
    alignSelf: "center",
    marginTop: 10,
    height: "85%",
    backgroundColor: "#F3F4F8",
    borderRadius: 25,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
  },

  backButton: {
    padding: 5,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },

  listContainer: {
    padding: 20,
    flexGrow: 1,
  },

  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },

  assetIcon: {
    marginRight: 15,
  },

  assetInfo: {
    flex: 1,
  },

  assetName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  assetSubtext: {
    fontSize: 13,
    color: "#777",
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
