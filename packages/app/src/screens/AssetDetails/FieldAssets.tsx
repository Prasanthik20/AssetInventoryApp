import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { Asset, baseURL, RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fieldStyles from './field.styles';
import { globalColors } from '../../styles/globalStyles';
import useAssetMeta from '../../hooks/useAssetMeta';
import AssetFiltersBar from 'src/components/common/AssetFiltersBar';
import AppSnackbar from 'src/components/common/AppSnackbar';

type FieldAssetsNavProp = StackNavigationProp<
  RootStackParamList,
  'FieldAssets'
>;

interface LocationStat {
  location: string;
  count: number;
}

const FieldAssets: React.FC = () => {
  const navigation = useNavigation<FieldAssetsNavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'FieldAssets'>>();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

  const styles = fieldStyles(isMobileLayout);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]); // 🔥 For search filtering
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const { categories } = useAssetMeta();
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

  // 1. New state for Category Filter
  const [selectedCategory, setSelectedCategory] = useState('');
  const assetCategories = categories
    .map((item) => String(item?.category || '').trim())
    .filter(Boolean);
  const selectedEmployeeId = String(route.params?.employeeId || '').trim();
  const selectedUserName = String(route.params?.operatorName || '')
    .trim()
    .toLowerCase();

  // 1. 🔥 Corrected Overdue Logic (Moved outside or kept once)
  const isAssetOverdue = (expectedReturnDate?: string | null) => {
    if (!expectedReturnDate) return false;

    // 🇮🇳 Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istToday = new Date(
      now.getTime() + now.getTimezoneOffset() * 60000 + istOffset,
    );
    istToday.setHours(0, 0, 0, 0);

    // 📅 Parse the return date
    const returnDate = new Date(expectedReturnDate);
    const istReturnDate = new Date(
      returnDate.getTime() + returnDate.getTimezoneOffset() * 60000 + istOffset,
    );
    istReturnDate.setHours(0, 0, 0, 0);

    // If the return date is strictly before today's date in IST, it is overdue
    return istReturnDate < istToday;
  };

  // 2. Updated Filtering Logic
  // This effect runs whenever assets, searchQuery, or selectedCategory changes
  useEffect(() => {
    const userScopedAssets = assets.filter(asset => {
      if (!selectedEmployeeId && !selectedUserName) return true;

      const operatorId = String(asset.operatorId || asset.receiverId || '').trim();
      const assigneeName = String(asset.assignedTo || '').trim().toLowerCase();

      const matchesByEmployeeId = selectedEmployeeId
        ? operatorId === selectedEmployeeId
        : false;
      const matchesByName = selectedUserName
        ? assigneeName.includes(selectedUserName)
        : false;

      return matchesByEmployeeId || matchesByName;
    });

    const filtered = userScopedAssets.filter(asset => {
      const categoryMatch = selectedCategory
        ? String(asset.category || '')
            ?.toLowerCase()
            .includes(selectedCategory.toLowerCase())
        : true;

      const searchMatch = searchQuery
        ? asset.assetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return categoryMatch && searchMatch;
    });
    setFilteredAssets(filtered);

    const locationCounts = filtered.reduce(
      (acc: Record<string, number>, asset) => {
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

    setLocationStats(locationEntries);
  }, [searchQuery, selectedCategory, assets, selectedEmployeeId, selectedUserName]);

  /* 🔹 Load logged-in supervisor */
  useEffect(() => {
    const loadUser = async () => {
      const user = await AsyncStorage.getItem('user');
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
            status:
              asset.status === 'Assigned' && overdue ? 'Overdue' : asset.status,
          };
        })
        .filter(
          (asset: Asset) =>
            asset.status === 'Assigned' || asset.status === 'Overdue',
        );

      setAssets(processed);
      setFilteredAssets(processed);
    } catch (err) {
      console.error('Error fetching assets:', err);
      showSnackbar('Failed to fetch assets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
    }, []),
  );

  // 3. 🔥 Search Logic
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredAssets(assets);
      return;
    }
    const query = text.toLowerCase();
    const filtered = assets.filter(
      a =>
        a.assetName?.toLowerCase().includes(query) ||
        a.barcode?.toLowerCase().includes(query) ||
        a.assignedTo?.toLowerCase().includes(query) ||
        a.location?.toLowerCase().includes(query),
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
        assignmentId: selectedAsset.assignmentId
          ? Number(selectedAsset.assignmentId)
          : null,
        operatorId: Number(selectedAsset.senderId || adminId), // The Supervisor sending it
        receiverId: Number(
          selectedAsset.receiverId || selectedAsset.operatorId,
        ), // The Operator receiving it
        reason: reason,
      };

      console.log('SENDING CORRECTED PAYLOAD:', payload);

      const response = await axios.post(
        `${baseURL}/api/notifications/supervisor`,
        payload,
      );

      if (response.status === 200 || response.status === 201) {
        showSnackbar('Notification sent successfully!', 'success');
        handleCloseModal();
        fetchAssets();
      }
    } catch (error: any) {
      console.error('API Error:', error.response?.data || error.message);
      showSnackbar(
        error.response?.data?.message || 'Failed to send notification',
        'error',
      );
    }
  };

  const renderAsset = ({ item }: { item: Asset }) => {
    const isOverdue = item.status?.toLowerCase() === 'overdue';

    return (
      <View style={styles.assetRow}>
        <Ionicons
          name="business-outline"
          size={24}
          color="#34D399"
          style={renderStyles.assetIcon}
        />
        <View style={renderStyles.assetInfo}>
          <Text style={renderStyles.assetName}>
            {item.assetName} ({item.barcode})
          </Text>
          <Text style={renderStyles.assetSubtext}>
            Last User: {item.assignedTo || 'N/A'}
          </Text>
          <Text style={renderStyles.assetSubtext}>
            Location: {item.location || 'N/A'}
          </Text>
          {item.expectedReturnDate && (
            <Text style={renderStyles.assetSubtext}>
              Expected Return:{' '}
              {new Date(item.expectedReturnDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'Asia/Kolkata', // 🔥 Forces display in IST
              })}
            </Text>
          )}
          {isOverdue && (
            <View style={renderStyles.overdueBadge}>
              <Text style={renderStyles.overdueText}>OVERDUE</Text>
            </View>
          )}
        </View>

        {isOverdue && (
          <TouchableOpacity
            style={[renderStyles.actionButton, renderStyles.notifyButton]}
            onPress={() => handleOpenModal(item)}
          >
            <Ionicons name="notifications" size={16} color="#fff" />
            <Text style={renderStyles.actionButtonText}>Notify</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            isMobileLayout && {
              width: '100%',
              height: '100%',
              borderRadius: 0,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back-outline" size={24} color="#E6F3FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Assets In Fields</Text>
            <View style={{ width: 40 }} />
          </View>
          {/* 3. Side-by-Side Search and Filter Row */}
          <AssetFiltersBar
            isMobileLayout={isMobileLayout}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search..."
            showCategory
            categoryValue={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categoryOptions={assetCategories}
            categoryAllLabel="All Assets"
            containerStyle={isMobileLayout ? renderStyles.controlsRowMobile : renderStyles.controlsRow}
            searchContainerStyle={renderStyles.searchContainerInRow}
            searchInputStyle={renderStyles.searchInputInRow}
            filtersContainerStyle={[renderStyles.dropdownContainer, isMobileLayout && { width: '100%' }]}
            pickerWrapperStyle={renderStyles.dropdownContainer}
            pickerStyle={renderStyles.picker}
          />

          <View style={renderStyles.locationStatsCard}>
            <View style={renderStyles.locationStatsHeader}>
              <View style={renderStyles.locationStatsIconBg}>
                <Feather name="map-pin" size={16} color="#22D3EE" />
              </View>
              <Text style={renderStyles.locationStatsTitle}>
                Assets By Location
              </Text>
            </View>

            {locationStats.length === 0 ? (
              <Text style={renderStyles.locationStatsEmpty}>
                No location data.
              </Text>
            ) : (
              <View style={renderStyles.locationGrid}>
                {locationStats.map(item => (
                  <View key={item.location} style={renderStyles.locationCell}>
                    <Text style={renderStyles.locationName} numberOfLines={1}>
                      {item.location}
                    </Text>
                    <Text style={renderStyles.locationCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <FlatList
              data={filteredAssets}
              renderItem={renderAsset}
              keyExtractor={item => item.id.toString()}
              style={{ flex: 1 }}
              contentContainerStyle={renderStyles.listContainer}
              refreshing={loading}
              onRefresh={fetchAssets}
              ListEmptyComponent={
                <Text style={renderStyles.emptyText}>
                  No assets found in the field.
                </Text>
              }
            />
          </View>

          {selectedAsset && (
            <OverdueNotificationModal
              visible={isModalVisible}
              onClose={handleCloseModal}
              onSubmit={handleSubmitNotification}
              assetName={selectedAsset.assetName}
            />
          )}
          <AppSnackbar
            visible={snackbar.visible}
            message={snackbar.message}
            kind={snackbar.kind}
            onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
            bottom={isMobileLayout ? 16 : 20}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const renderStyles = StyleSheet.create({
  assetIcon: {
    marginRight: 15,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E6F3FF',
  },
  assetSubtext: {
    fontSize: 13,
    color: '#A9C6E4',
    marginTop: 2,
  },
  assetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: globalColors.textBody,
  },
  
  overdueBadge: {
    marginTop: 5,
    backgroundColor: globalColors.brandRed,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },

  overdueText: {
    color: globalColors.surfacePrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  notifyBtn: {
    backgroundColor: globalColors.brandPrimary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: globalColors.overlayDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notifyButton: {
    backgroundColor: '#F97373',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  controlsRowMobile: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  searchContainerInRow: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  searchInputInRow: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#E6F3FF',
  },
  dropdownContainer: {
    flex: 1.2,
    // backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 45,
    color: '#E6F3FF',
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 15,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  locationStatsCard: {
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    padding: 12,
  },
  locationStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationStatsIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(7, 24, 42, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  locationStatsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E6F3FF',
  },
  locationStatsEmpty: {
    fontSize: 13,
    color: '#A9C6E4',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationCell: {
    minWidth: 110,
    maxWidth: 160,
    flexGrow: 1,
    backgroundColor: 'rgba(7, 24, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  locationName: {
    fontSize: 12,
    color: '#A9C6E4',
    marginBottom: 4,
  },
  locationCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34D399',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 90,
    fontSize: 16,
    color: '#A9C6E4',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default FieldAssets;
