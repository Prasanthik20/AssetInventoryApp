import React, { useRef, useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    useWindowDimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Asset, baseURL, RootStackParamList } from "../../navigation/types";
import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";
import axios from "axios";
import { useAssetFilter } from "src/hooks/useAssetFilter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigateToDashboard } from '../../utils/navigation';
import { globalColors, globalStyleTokens } from "../../styles/globalStyles";
import ScreenWrapper from 'src/components/common/ScreenWrapper';
import AssetCard from 'src/components/common/AssetCard';
import useAssetMeta from '../../hooks/useAssetMeta';
import AssetFiltersBar from 'src/components/common/AssetFiltersBar';
import AppSnackbar from 'src/components/common/AppSnackbar';

type AssetsDetailsNavigationProp = StackNavigationProp<
    RootStackParamList,
    "TotalAssetDetails"
>;

const StatusBadge = ({
    status,
    assignedTo,
    assignedBy,
    location
}: {
    status: string | null;
    assignedTo?: string | null;
    assignedBy?: string | null;
    location?: string;
}) => {
    // This is now a more flexible, data-driven approach
    const getStatusStyle = () => {
        let backgroundColor = 'rgba(148, 163, 184, 0.18)';
        let borderColor = '#94A3B8';
        let textColor = '#E2E8F0';

        switch (status?.toLowerCase()) {
            case 'assigned':
                backgroundColor = 'rgba(34, 211, 238, 0.18)'; borderColor = '#22D3EE'; textColor = '#A5F3FC';
                break;
            case 'overdue':
                backgroundColor = 'rgba(249, 115, 115, 0.18)'; borderColor = '#F97373'; textColor = '#FECACA';
                break;
            case 'returned':
                backgroundColor = 'rgba(52, 211, 153, 0.18)'; borderColor = '#34D399'; textColor = '#A7F3D0';
                break;
            case 'unassigned':
                backgroundColor = 'rgba(148, 163, 184, 0.18)'; borderColor = '#94A3B8'; textColor = '#E2E8F0';
                break;
        }

        return { backgroundColor, borderColor, textColor };
    };

    const { backgroundColor, borderColor, textColor } = getStatusStyle();

    return (
        <View style={[styles.statusContainer, { backgroundColor, borderColor }]}>

            {/* STATUS LABEL */}
            <Text style={[styles.statusText, { color: textColor }]}>
                {status}
            </Text>

            {/* WHO ASSIGNED, OR WHERE? */}
            <Text style={[styles.statusSubtext, { color: textColor }]}>
                {assignedBy
                    ? `By: ${assignedBy}`
                    : assignedTo
                        ? `To: ${assignedTo}`
                        : `At: ${location}`
                }
            </Text>
        </View>
    );
};

const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return 'N/A';

    return parsedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const TotalAssetsDetails: React.FC = () => {
    const navigation = useNavigation<AssetsDetailsNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'TotalAssetDetails'>>();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    const isNarrowWeb = Platform.OS !== 'web' || width < 420;
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const [supervisorId, setSupervisorId] = useState<number | null>(null);
    const [supervisorName, setSupervisorName] = useState<string>('');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        visible: boolean;
        message: string;
        kind: 'success' | 'error' | 'info';
    }>({ visible: false, message: '', kind: 'info' });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { categories } = useAssetMeta();
    const assetCategories = categories
        .map((item) => String(item?.category || '').trim())
        .filter(Boolean);

    const {
        searchText,
        setSearchText,
        selectedName,
        setSelectedName,
        selectedLocation,
        setSelectedLocation,
        selectedStatus,
        setSelectedStatus,
        filteredAssets,
        uniqueNames,
        uniqueLocations,
        uniqueStatuses,
        clearFilters,
    } = useAssetFilter(assets);

    useEffect(() => {
        const statusFromRoute = route.params?.statusFilter;
        if (statusFromRoute) {
            setSelectedStatus(statusFromRoute);
        }
    }, [route.params?.statusFilter, setSelectedStatus]);

    /* 🔹 Load logged-in supervisor */
    useEffect(() => {
        const loadUser = async () => {
            const user = await AsyncStorage.getItem("user");
            if (user) {
                const parsed = JSON.parse(user);
                setSupervisorId(Number(parsed.employeeId));
                setSupervisorName(parsed.fullName || parsed.name || '');
            }
        };
        loadUser();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAssets(1, false);
        }, [])
    );

    /* 🔹 Fetch assets with pagination */
    const fetchAssets = async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const response = await axios.get(`${baseURL}/api/assets`, {
                params: { page: pageNum, limit: 50 }
            });
            const rawData = response.data.assets || [];
            const { total, totalPages } = response.data;

            setTotalCount(total || 0);
            setHasMore(pageNum < (totalPages || 1));

            // De-duplicate by id
            const uniqueMap = new Map();
            rawData.forEach((item: any) => {
                const id = item.assetId || item.id;
                if (!uniqueMap.has(id)) uniqueMap.set(id, item);
            });

            const newAssets = Array.from(uniqueMap.values()) as Asset[];
            setAssets(prev => {
                if (!append) return newAssets;
                const existingIds = new Set(prev.map(a => a.assetId || a.id));
                const filteredNew = newAssets.filter(a => !existingIds.has(a.assetId || a.id));
                return [...prev, ...filteredNew];
            });
        } catch (err) {
            setError("Failed to fetch assets.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchAssets(nextPage, true);
        }
    };

    /* 🔹 Open modal */
    const handleOpenModal = (asset: Asset) => {
        setSelectedAsset(asset);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedAsset(null);
    };

    const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSnackbar({ visible: true, message, kind });
        timeoutRef.current = setTimeout(() => {
            setSnackbar((prev) => ({ ...prev, visible: false }));
        }, 3200);
    };

    /* 🔹 Send notification */
    const handleSubmitNotification = async (reason: string) => {
        if (!selectedAsset) return;

        try {
            const payload = {
                // ✅ MATCHING YOUR BACKEND supervisor.ts NAMES:
                assetId: Number(selectedAsset.id),
                assignmentId: selectedAsset.assignmentId ? Number(selectedAsset.assignmentId) : null,
                operatorId: Number(selectedAsset.senderId || supervisorId), // The Supervisor sending it
                receiverId: Number(selectedAsset.receiverId || selectedAsset.operatorId), // The Operator receiving it
                reason: reason,
            };

            console.log("SENDING CORRECTED PAYLOAD:", payload);

            const response = await axios.post(
                `${baseURL}/api/notifications/manager`,
                payload
            );

            if (response.status === 200 || response.status === 201) {
                showSnackbar("Notification sent successfully!", 'success');
                handleCloseModal();
                fetchAssets();
            }
        } catch (error: any) {
            console.error("API Error:", error.response?.data || error.message);
            showSnackbar(error.response?.data?.message || "Failed to send notification", 'error');
        }
    };

    // Replace filteredAssets in your FlatList with this:
    const finalDisplayAssets = filteredAssets.filter((asset) => {
        if (!selectedName) return true;
        return String(asset.category || '').toLowerCase().includes(selectedName.toLowerCase());
    });
    // --- RENDER FUNCTION IS NOW SEPARATE AND CLEAN ---
    const renderAsset = ({ item, index }: { item: Asset; index: number }) => {
        const handlePress = () => {
            navigation.navigate('AssetFullDetails', { asset: item });
        };
        const handleAssignPress = (assetToAssign: Asset) => {
            navigation.navigate('AssignAsset', {
                supervisor_employeeId: String(supervisorId || ''),
                supervisorName: supervisorName,
                editAsset: {
                    ...assetToAssign,
                    assetId: Number(assetToAssign.assetId || assetToAssign.id),
                },
            });
        };
        return (
            <AssetCard 
                asset={item} 
                isMobileLayout={isMobileLayout} 
                onPress={handlePress} 
                onAssignPress={handleAssignPress}
                index={index} 
            />
        );
    };

    const handleGoBack = async () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            await navigateToDashboard(navigation);
        }
    };

    return (
        <ImageBackground source={require("../../assets/Company-bg.webp")} style={styles.backgroundImage}>
            <ScreenWrapper contentContainerStyle={{ flex: 1 }}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#E0E0E0" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>All Assets</Text>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#0F766E',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8,
                                marginLeft: 'auto',
                                marginRight: 12,
                            }}
                            onPress={() =>
                                navigation.navigate('AssignAsset', {
                                    supervisor_employeeId: String(supervisorId || ''),
                                    supervisorName: supervisorName,
                                })
                            }
                        >
                            <Ionicons name="swap-horizontal-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Assign Asset</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#A9C6E4', fontSize: 13 }}>{totalCount} total</Text>
                    </View>

                    {/* BODY MUST BE flex: 1 */}
                    <View style={styles.body}>
                        <AssetFiltersBar
                            isMobileLayout={isMobileLayout}
                            searchValue={searchText}
                            onSearchChange={setSearchText}
                            searchPlaceholder="Search by name, barcode..."
                            showCategory={true}
                            categoryValue={selectedName}
                            onCategoryChange={setSelectedName}
                            categoryOptions={assetCategories}
                            showLocation={true}
                            locationValue={selectedLocation}
                            onLocationChange={setSelectedLocation}
                            locationOptions={uniqueLocations}
                            showStatus={true}
                            statusValue={selectedStatus}
                            onStatusChange={setSelectedStatus}
                            statusOptions={uniqueStatuses}
                            containerStyle={isNarrowWeb ? styles.topActionRowMobile : styles.topActionRow}
                            searchContainerStyle={isNarrowWeb ? styles.searchContainerMobile : styles.searchContainer}
                            searchInputStyle={styles.searchInput}
                            filtersContainerStyle={isNarrowWeb ? styles.mobileFilterContainer : styles.filterGroup}
                            pickerWrapperStyle={styles.pickerWrapper}
                            pickerStyle={styles.pickerInternal}
                        />

                        <View style={{ flex: 1 }}>
                            <FlatList<Asset>
                                data={finalDisplayAssets}
                                keyExtractor={(item) => (item.id || item.assetId).toString()}
                                renderItem={renderAsset}
                                numColumns={1}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingTop: isNarrowWeb ? 50 : 80, paddingBottom: Platform.OS === 'web' ? 0 : 20 }}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.3}
                                ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#A9C6E4" style={{ marginVertical: 16 }} /> : null}
                            />
                        </View>
                    </View>
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
            </ScreenWrapper>
        </ImageBackground>
    );
};


// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
    backgroundImage: globalStyleTokens.pageBackgroundImage,
    safeArea: { flex: 1, backgroundColor: '#071425' },
    // Container is now the full screen
    container: {
        flex: 1,
        backgroundColor: 'rgba(7, 24, 42, 0.82)',
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        // Made header semi-transparent as well
        backgroundColor: 'rgba(7, 24, 42, 0.9)',
        paddingVertical: 15,
        paddingHorizontal: 20,
        // No border radius needed for a full-width header
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#E6F3FF',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                cursor: 'pointer',
            } as any,
        }),
    },
    backButton: { marginRight: 20 },
    headerTitle: { color: '#E6F3FF', fontSize: 20, fontWeight: 'bold' },
    body: { flex: 1, paddingHorizontal: 15 },
    searchIcon: { marginRight: 10 },
    tableHeader: {
        display: 'flex',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(159, 207, 255, 0.22)',
    },

    filterRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 15,
    },

    topActionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
        width: '100%',
        alignItems: 'stretch',
        zIndex: 10,
        elevation: 10,
    },
    topActionRowMobile: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 10,
        paddingBottom: 0,
        width: '100%',
        flexShrink: 0,
        zIndex: 10,
        elevation: 10,
    },
    searchContainer: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(24, 58, 93, 0.95)',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 54,
        borderWidth: 1.5,
        borderColor: 'rgba(159, 207, 255, 0.65)',
    },
    searchContainerMobile: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(24, 58, 93, 0.95)',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 54,
        borderWidth: 1.5,
        borderColor: 'rgba(159, 207, 255, 0.65)',
    },
    mobileFilterContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    mobileFilterSubRow: {
        flexDirection: 'row',
        gap: 8,
    },
    desktopFilterSubRow: {
        flexDirection: 'row',
        flex: 2,
        gap: 10,
    },
    filterGroup: {
        flex: 3,
        flexDirection: 'row',
        gap: 10,
    },
    pickerWrapper: {
        flex: 1,
        backgroundColor: 'rgba(24, 58, 93, 0.95)',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(159, 207, 255, 0.65)',
        height: 54,
        justifyContent: 'center',
        overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
    },
    pickerInternal: {
        width: '100%',
        height: Platform.OS === 'android' ? 50 : '100%',
        backgroundColor: 'transparent',
        borderWidth: 0,
        fontSize: 14,
        color: '#E6F3FF',
        paddingHorizontal: 10,
        cursor: 'pointer',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                cursor: 'pointer',
            } as any,
        }),
    },
    headerCell: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#E6F3FF',
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12,
        width: '100%',
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    cellSNo: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cellAssetName: { flex: 2, marginRight: 0 },
    assetName: { fontSize: 15, fontWeight: 'bold', color: '#E6F3FF' },
    assetSubtext: { fontSize: 12, color: '#A9C6E4', marginTop: 2 },
    cellBarcode: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellStatus: { flex: 2 },
    cellDate: {
        flex: 1.2,
        justifyContent: 'center',
    },
    statusContainer: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
    },
    statusText: { fontSize: 13, fontWeight: 'bold' },
    statusSubtext: { fontSize: 11, marginTop: 2 },
    dateCellText: {
        fontSize: 12,
        color: '#E6F3FF',
        fontWeight: '600',
        textAlign: 'center',
    },
    mobileDateGroup: {
        flex: 1,
        minWidth: 120,
        alignItems: 'flex-end',
        paddingLeft: 12,
    },
    mobileActionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'flex-end',
        flex: 1,
        alignItems: 'center',
    },
    mobileDateLabel: {
        fontSize: 10,
        color: '#A9C6E4',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        fontWeight: '700',
    },
    mobileDateValue: {
        fontSize: 12,
        color: '#E6F3FF',
        fontWeight: '600',
        marginTop: 2,
    },
    knowMoreText: { color: globalColors.surfacePrimary, fontSize: 13, fontWeight: '600', marginRight: 5 },
    cellAction: {
        flex: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webActionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'flex-end',
        alignItems: 'center',
        minWidth: 0,
    },
    cellSNoHeader: { width: 50, textAlign: 'center' },
    cellAssetNameHeader: { flex: 2, textAlign: 'left' },
    cellBarcodeHeader: { flex: 2, textAlign: 'center' },
    cellStatusHeader: { flex: 2, textAlign: 'center' },
    cellDateHeader: { flex: 1.2, textAlign: 'center' },
    cellActionHeader: { flex: 1.5, textAlign: 'center' },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align buttons to the right
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 6, // Smaller padding
        paddingHorizontal: 10, // Smaller padding
        shadowColor: globalColors.overlayDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(7, 24, 42, 0.95)',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: globalColors.textInverse,
    },
    errorText: {
        fontSize: 18,
        color: globalColors.brandRed,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    mobileCard: {
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
        // Shadow for Android
        elevation: 3,
        // Shadow for iOS
        shadowColor: globalColors.overlayDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(159, 207, 255, 0.22)',
        paddingBottom: 10,
        marginBottom: 12,
    },
    cardInfoGrid: {
        marginBottom: 15,
        paddingHorizontal: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        color: '#A9C6E4',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 13,
        color: '#E6F3FF',
        fontWeight: '600',
    },
    cardActionsRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
        marginTop: 5,
    },
    indexBadge: {
        backgroundColor: globalColors.brandPrimary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    indexText: { color: globalColors.surfacePrimary, fontSize: 12, fontWeight: 'bold' },
    mobileBarcodeContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(7, 24, 42, 0.92)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    mobileBarcodeText: { fontSize: 12, color: '#A9C6E4', marginLeft: 4, fontWeight: '600' },
    mobileCardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mobileActionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    knowMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: globalColors.brandIndigo,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    notifyButton: {
        backgroundColor: globalColors.brandRed,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    editAssignedButton: {
        backgroundColor: globalColors.brandGreen,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    assignAssetButton: {
        backgroundColor: globalColors.brandBlue,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    actionButtonText: {
        color: globalColors.surfacePrimary,
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 5,
    },
});

export default TotalAssetsDetails;