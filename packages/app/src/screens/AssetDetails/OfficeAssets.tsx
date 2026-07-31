import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ImageBackground, FlatList, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { baseURL, Asset } from 'src/navigation/types';
import axios from 'axios';
import { useAssetFilter } from 'src/hooks/useAssetFilter';
import { globalColors, globalStyleTokens } from '../../styles/globalStyles';
import useAssetMeta from '../../hooks/useAssetMeta';
import AssetFiltersBar from 'src/components/common/AssetFiltersBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateToDashboard } from '../../utils/navigation';

import useFetchAssets from 'src/hooks/useFetchAssets';

const OfficeAssets: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isNarrowWeb = Platform.OS !== 'web' || width < 420;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  
  const { assets, loading, fetchAssets } = useFetchAssets({ filterStatus: 'Unassigned' });
  const { categories } = useAssetMeta();

  // Categories from API
  const assetCategories = categories
    .map((item) => String(item?.category || '').trim())
    .filter(Boolean);

  // 1. Keep the hook for managing the search/filter state values
  const {
    searchText,
    setSearchText,
    selectedName,
    setSelectedName,
  } = useAssetFilter(assets);

  // 2. NEW FILTER LOGIC: Apply both search and category filter directly to 'assets'
  const finalDisplayAssets = assets.filter((asset) => {
    // Category Filter: Match selected category against asset.category
    const matchesCategory = selectedName
      ? String(asset.category || '').toLowerCase().includes(selectedName.toLowerCase())
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

  useFocusEffect(
    useCallback(() => {
      if (assets.length === 0) {
        fetchAssets();
      }
    }, [assets.length])
  );

  const handleGoBack = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      await navigateToDashboard(navigation);
    }
  };

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
            <TouchableOpacity onPress={handleGoBack}><Ionicons name="arrow-back-outline" size={24} color="#fff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Assets In Office</Text>
            <View style={{ width: 40 }} />
          </View>

          <AssetFiltersBar
            isMobileLayout={isMobileLayout}
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder="Search..."
            showCategory
            categoryValue={selectedName}
            onCategoryChange={setSelectedName}
            categoryOptions={assetCategories}
            categoryAllLabel="All Assets"
            containerStyle={isNarrowWeb ? styles.topControlsRowMobile : styles.topControlsRow}
            searchContainerStyle={isNarrowWeb ? styles.searchContainerMobile : styles.searchContainer}
            searchInputStyle={styles.searchInput}
            pickerWrapperStyle={styles.dropdownContainer}
            pickerStyle={styles.picker}
          />

          {/* Asset List using the new finalDisplayAssets */}
          <View style={{ flex: 1 }}>
            <FlatList
              data={finalDisplayAssets}
              keyExtractor={item => item.id.toString()}
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={styles.assetRow}>
                  <Ionicons name="business-outline" size={24} color="#22D3EE" style={styles.assetIcon} />
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
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};
// Reuse the same styles from AssetsDetails.tsx by importing them, or copy-paste the styles object here.
// For brevity, I'll assume you copy the 'styles' object from the previous file.
const styles = StyleSheet.create({
  backgroundImage: {
    ...globalStyleTokens.pageBackgroundImage,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#071425',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 42, 0.82)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    shadowColor: globalColors.overlayDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    color: '#E6F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7, 24, 42, 0.9)',
    padding: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#E6F3FF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
    zIndex: 10,
    elevation: 10,
  },
  topControlsRowMobile: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
    zIndex: 10,
    elevation: 10,
  },
  searchContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 10,
    // paddingHorizontal: 10,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  searchContainerMobile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 10,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  pickerWrapper: {
    flex: 2,
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 10,
    height: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  pickerElement: {
    height: 54,
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
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 16, fontWeight: 'bold', color: '#E6F3FF' },
  assetSubtext: { fontSize: 13, color: '#A9C6E4' },
  assetIcon: { marginRight: 15 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#A9C6E4' },
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchBar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#E6F3FF',
  },
  dropdownContainer: {
    flex: 1,
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    overflow: 'hidden',
  },
  picker: {
    height: 54,
    width: '100%',
    color: '#E6F3FF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS == 'web' ? 0 : 30,
    paddingBottom: 20,
  }
});
export default OfficeAssets;