import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";

import { Asset, RootStackParamList } from '../../navigation/types';

type FieldAssetsNavProp = StackNavigationProp<
  RootStackParamList,
  'FieldAssets'
>;

const FieldAssets: React.FC = () => {
  const navigation = useNavigation<FieldAssetsNavProp>();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔥 Check if asset is overdue
  const isAssetOverdue = (expectedReturnDate?: string | null) => {
    if (!expectedReturnDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const returnDate = new Date(expectedReturnDate);
    return returnDate < today;
  };

  // 🔥 Fetch assets and filter only assigned + overdue logic
 const fetchAssets = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/assets');
    const data = await res.json();

    // Step 1: Process all assets to mark overdue
    const processed = (data.assets || []).map((asset: Asset) => ({
      ...asset,
      status: isAssetOverdue(asset.expectedReturnDate)
        ? "Overdue"
        : asset.status
    }));

    // Step 2: Filter only assigned or overdue assets
    const assignedOrOverdue = processed.filter(
      (asset: Asset) => asset.status === "Assigned" || asset.status === "Overdue"
    );

    setAssets(assignedOrOverdue);
  } catch (err) {
    console.error("Error fetching assets:", err);
    setAssets([]);
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchAssets();
  }, []);

  // 🔥 Open modal
  const openOverdueModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setModalVisible(true);
  };


   // Send notification to operator (POST)
const sendNotification = async (assetId: string, reason: string) => {
  try {
    console.log({
  assetId: assetId,
  assignmentId: selectedAsset?.assignmentId,
  senderId: selectedAsset?.senderId,
  receiverId: selectedAsset?.operatorId,
  reason,
});
    await axios.post(
      'http://localhost:3000/api/notifications/overdue-assets',
      {
        assetId: assetId,  // <-- use assetId (string parameter)
        assignmentId: selectedAsset?.assignmentId ?? null,
        senderId: selectedAsset?.senderId ?? null,
        receiverId: selectedAsset?.operatorId ?? null,
        reason,
      }
      
    );
    console.log({
  assetId: assetId,
  assignmentId: selectedAsset?.assignmentId,
  senderId: selectedAsset?.senderId,
  receiverId: selectedAsset?.operatorId,
  reason,
});
    Alert.alert("Success", "Operator notified successfully!");
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Could not send notification");
  }
};

   // Quick notify (default reason)
  const quickNotify = async (asset: Asset) => {
    const defaultReason = "Asset overdue. Please take action.";
    await sendNotification(asset.id, defaultReason);
  };


  // 🔥 Render each asset row
   const renderAsset = ({ item }: { item: Asset }) => (
    <View style={styles.assetRow}>
      <Ionicons
        name="business-outline"
        size={24}
        color="#3B59B8"
        style={styles.assetIcon}
      />

      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>
          {item.assetName} ({item.barcode})
        </Text>

        <Text style={styles.assetSubtext}>
          Last User: {item.assignedTo || "N/A"}
        </Text>

        {item.expectedReturnDate && (
          <Text style={styles.assetSubtext}>
            Expected Return: {item.expectedReturnDate}
          </Text>
        )}

        {item.status === "Overdue" && (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>OVERDUE</Text>
          </View>
        )}
      </View>

      {item.status === "Overdue" && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Open modal to enter custom reason */}
          <TouchableOpacity
            onPress={() => openOverdueModal(item)}
            style={styles.notifyBtn}
          >
            <Text style={styles.notifyText}>Notify</Text>
          </TouchableOpacity>

          {/* Quick notify with default reason
          <TouchableOpacity
            onPress={() => quickNotify(item)}
            style={[styles.notifyBtn, { backgroundColor: '#27B2C3' }]}
          >
            <Text style={styles.notifyText}>Quick Notify</Text>
          </TouchableOpacity> */}
        </View>
      )}
    </View>
  );

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
            />
          </View>

          <FlatList
            data={assets}
            renderItem={renderAsset}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <OverdueNotificationModal
            visible={modalVisible}
                onClose={() => {
                            setModalVisible(false);
                            setSelectedAsset(null);
                          }}
                onSubmit={(reason) => {
            if (selectedAsset) {
                sendNotification(selectedAsset.id, reason);
            }
                setModalVisible(false);
                setSelectedAsset(null);
                }}
              assetName={selectedAsset?.assetName ?? ''}
              title="Notify Supervisor"
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
});

export default FieldAssets;
