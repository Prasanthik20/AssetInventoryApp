import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, FlatList, TouchableOpacity, TextInput, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { baseURL,Asset } from 'src/navigation/types';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useAssetFilter } from 'src/hooks/useAssetFilter';

const OfficeAssets: React.FC = () => {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

 // Categories requested
  const assetCategories = ["Battery", "Antenna", "Rover", "Controller"];

  // 1. Keep the hook for managing the search/filter state values
  const {
    searchText,
    setSearchText,
    selectedName,
    setSelectedName,
  } = useAssetFilter(assets);

 // 2. NEW FILTER LOGIC: Apply both search and category filter directly to 'assets'
  const finalDisplayAssets = assets.filter((asset) => {
    // Category Filter: Check if assetName includes the selected category (e.g., "Antenna")
    const matchesCategory = selectedName 
      ? asset.assetName.toLowerCase().includes(selectedName.toLowerCase()) 
      : true;

    // Search Filter: Check if assetName or barcode matches search text
    const matchesSearch = searchText
      ? asset.assetName.toLowerCase().includes(searchText.toLowerCase()) ||
      asset.assignedTo?.toLowerCase().includes(searchText.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchText.toLowerCase()) ||
        // barcode may be undefined, so check before calling toLowerCase
        (asset.barcode?.toLowerCase().includes(searchText.toLowerCase()) ?? false)
      : true;

    return matchesCategory && matchesSearch;
  });

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/assets`);
      const data = response.data;

      // Filter for Unassigned assets (Office)
      const officeAssets = data.assets.filter((asset: Asset) => asset.status === 'Unassigned');
      setAssets(officeAssets);
    } catch (err) {
      console.error('Error fetching office assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

   return (
    <ImageBackground source={require("../../assets/Company-bg.webp")} style={styles.backgroundImage} resizeMode="cover" blurRadius={5}>
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            isMobileLayout && { width: '100%', height: '100%', borderRadius: 0 },
            height < 700 && { height: '100%' },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-outline" size={24} color="#fff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Assets In Office</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Combined Search and Filter Row */}
          <View style={[styles.topControlsRow, isMobileLayout && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color="#888" style={styles.searchIcon} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor="#888"
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <View style={[styles.dropdownContainer, isMobileLayout && { width: '100%' }]}>
              <Picker
                selectedValue={selectedName}
                onValueChange={(val) => setSelectedName(val)}
                style={styles.picker}
              >
                <Picker.Item label="All Assets" value="" />
                {assetCategories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Asset List using the new finalDisplayAssets */}
          <FlatList
            data={finalDisplayAssets}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.assetRow}>
                <Ionicons name="business-outline" size={24} color="#3B59B8" style={styles.assetIcon} />
                <View style={styles.assetInfo}>
                  <Text style={styles.assetName}>{item.assetName} ({item.barcode})</Text>
                  <Text style={styles.assetSubtext}>Serial No: {item.serialNumber || 'N/A'}</Text>
                  <Text style={styles.assetSubtext}>Last User: {item.assignedTo || 'N/A'}</Text>
                  <Text style={styles.assetSubtext}>Location: {item.location || 'N/A'}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No assets found.</Text>}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};
// Reuse the same styles from AssetsDetails.tsx by importing them, or copy-paste the styles object here.
// For brevity, I'll assume you copy the 'styles' object from the previous file.
const styles = StyleSheet.create({
    /* PASTE STYLES FROM AssetsDetails.tsx HERE */
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
        backgroundColor: "rgba(61, 138, 233, 0.4)",
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
    topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10, // Works in newer React Native versions
  },
  searchContainer: {
    flex: 2, // Takes up more space
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerWrapper: {
    flex: 1.5, // Dropdown size
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerElement: {
    height: 45,
    width: '100%',
    backgroundColor: 'transparent',
  },
 
  searchIcon: { marginRight: 5 },
  inlineClearButton: {
    padding: 5,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  assetSubtext: { fontSize: 13, color: '#666' },
  assetIcon: { marginRight: 15 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchBar: {
    flex: 2, // Search takes more space
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  dropdownContainer: {
    flex: 1, // Filter takes less space
    backgroundColor: '#fff',
    borderRadius: 8,
    height: 45,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    overflow: 'hidden',
  },
  picker: {
    height: 45,
    width: '100%',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  }
});
export default OfficeAssets;