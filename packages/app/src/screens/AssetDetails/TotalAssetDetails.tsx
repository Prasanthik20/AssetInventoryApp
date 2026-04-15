import React, { useRef, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ImageBackground,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    useWindowDimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Asset, baseURL, RootStackParamList } from "../../navigation/types";
import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";
import axios from "axios";
import { useAssetFilter } from "src/hooks/useAssetFilter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { globalColors, globalStyleTokens } from "../../styles/globalStyles";
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
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        fetchAssets();
    }, []);
    /* 🔹 Fetch assigned assets */
    const fetchAssets = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${baseURL}/api/assets`);
            const rawData = response.data.assets || response.data || [];

            // 🔥 Remove duplicates by Asset ID
            const uniqueMap = new Map();
            rawData.forEach((item: any) => {
                // Use assetId (or id) as the unique key
                const id = item.assetId || item.id;
                if (!uniqueMap.has(id)) {
                    uniqueMap.set(id, item);
                }
            });

            setAssets(Array.from(uniqueMap.values()));
        } catch (err) {
            setError("Failed to fetch assets.");
        } finally {
            setLoading(false);
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
                `${baseURL}/api/notifications/supervisor`,
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
    const renderAsset = ({ item, index }: { item: Asset, index: number }) => {

        const isOverdue = item.status?.toLowerCase() === 'overdue';
        const isAssignedAsset = ['assigned', 'overdue'].includes(
            String(item.status || '').toLowerCase(),
        );
        if (isMobileLayout) {
            return (
                <View style={styles.mobileCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.indexBadge}>
                                <Text style={styles.indexText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.assetName}>{item.assetName}</Text>
                        </View>
                        <View style={styles.mobileBarcodeContainer}>
                            <MaterialCommunityIcons name="barcode" size={32} color="#A9C6E4" />
                            <Text style={styles.mobileBarcodeText}> S/N: {item.serialNumber}</Text>
                        </View>
                    </View>
                    
                    <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: 'space-between', marginTop: 15 }}>
                        <StatusBadge
                            status={item.status || null}
                            assignedTo={item.assignedTo}
                            location={item.location} 
                        />
                        <View style={styles.mobileDateGroup}>
                            <Text style={styles.mobileDateLabel}>Expected Due Date</Text>
                            <Text style={styles.mobileDateValue}>{formatDate(item.expectedReturnDate)}</Text>
                            <Text style={[styles.mobileDateLabel, { marginTop: 6 }]}>Assigned Date</Text>
                            <Text style={styles.mobileDateValue}>{formatDate(item.assignedDate)}</Text>
                            <Text style={[styles.mobileDateLabel, { marginTop: 6 }]}>Assigned By</Text>
                            <Text style={styles.mobileDateValue}>{item.assignedBy || '—'}</Text>
                        </View>
                        <View style={styles.mobileActionButtons}>
                            {!isAssignedAsset && (
                                <TouchableOpacity
                                    style={styles.assignAssetButton}
                                    onPress={() =>
                                        navigation.navigate('AssignAsset', {
                                            supervisor_employeeId: String(supervisorId),
                                            supervisorName: supervisorName,
                                        })
                                    }
                                >
                                    <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" />
                                    <Text style={styles.actionButtonText}>Assign</Text>
                                </TouchableOpacity>
                            )}
                            {isOverdue && (
                                <TouchableOpacity style={styles.notifyButton} onPress={() => handleOpenModal(item)}>
                                    <Ionicons name="notifications" size={16} color="#fff" />
                                    <Text style={styles.actionButtonText}>Notify</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={styles.knowMoreButton} 
                                onPress={() => navigation.navigate('AssetFullDetails', { asset: item })}
                            >
                                <Ionicons name="information-circle-outline" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Know More</Text>
                            </TouchableOpacity>
                            {isAssignedAsset && (
                                <TouchableOpacity
                                    style={styles.editAssignedButton}
                                    onPress={() =>
                                        navigation.navigate('AssignAsset', {
                                            supervisor_employeeId: String(supervisorId || ''),
                                            supervisorName: supervisorName,
                                            editAsset: item,
                                        })
                                    }
                                >
                                    <Feather name="edit-2" size={16} color="#fff" />
                                    <Text style={styles.actionButtonText}>Edit Assigned</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            );
        }

        // WEB LAYOUT - Columns now align with Header Cells
        return (
            <View style={styles.assetRow}>
                <View style={[styles.cellSNo, { width: 50, alignItems: 'center' }]}>
                    <View style={styles.indexBadge}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                    </View>
                </View>

                <View style={[styles.cellAssetName, { flex: 2 }]}>
                    <Text style={styles.assetName}>{item.assetName}</Text>
                </View>

                <View style={[styles.cellBarcode, { flex: 2, alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="barcode" size={40} color="#A9C6E4" />
                    <Text style={styles.mobileBarcodeText}>S/N: {item.serialNumber}</Text>
                </View>

                <View style={[styles.cellStatus, { flex: 2, alignItems: 'center' }]}>
                    <StatusBadge
                        status={item.status || null}
                        assignedTo={item.assignedTo}
                        location={item.location} 
                    />
                </View>

                <View style={[styles.cellDate, { flex: 1.2, alignItems: 'center' }]}> 
                    <Text style={styles.dateCellText}>{formatDate(item.expectedReturnDate)}</Text>
                </View>

                <View style={[styles.cellDate, { flex: 1.2, alignItems: 'center' }]}> 
                    <Text style={styles.dateCellText}>{formatDate(item.assignedDate)}</Text>
                </View>

                <View style={[styles.cellDate, { flex: 1.2, alignItems: 'center' }]}> 
                    <Text style={styles.dateCellText}>{item.assignedBy || '—'}</Text>
                </View>

                <View style={[styles.cellAction, styles.webActionButtons]}> 
                    {!isAssignedAsset && (
                        <TouchableOpacity
                            style={styles.assignAssetButton}
                            onPress={() =>
                                navigation.navigate('AssignAsset', {
                                    supervisor_employeeId: String(supervisorId),
                                    supervisorName: supervisorName,
                                })
                            }
                        >
                            <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Assign</Text>
                        </TouchableOpacity>
                    )}
                    {isOverdue && (
                        <TouchableOpacity style={styles.notifyButton} onPress={() => handleOpenModal(item)}>
                            <Ionicons name="notifications" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Notify</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={styles.knowMoreButton} 
                        onPress={() => navigation.navigate('AssetFullDetails', { asset: item })}
                    >
                        <Ionicons name="information-circle-outline" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Know More</Text>
                    </TouchableOpacity>
                    {isAssignedAsset && (
                        <TouchableOpacity
                            style={styles.editAssignedButton}
                            onPress={() =>
                                navigation.navigate('AssignAsset', {
                                    supervisor_employeeId: String(supervisorId || ''),
                                    supervisorName: supervisorName,
                                    editAsset: item,
                                })
                            }
                        >
                            <Feather name="edit-2" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Edit Assigned</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ImageBackground source={require("../../assets/Company-bg.webp")} style={styles.backgroundImage}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#E0E0E0" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>All Assets</Text>
                    </View>
                    
                    {/* BODY MUST BE flex: 1 */}
                    <View style={styles.body}>
                        <AssetFiltersBar
                            isMobileLayout={isMobileLayout}
                            searchValue={searchText}
                            onSearchChange={setSearchText}
                            searchPlaceholder="Search by name, barcode..."
                            showCategory
                            categoryValue={selectedName}
                            onCategoryChange={setSelectedName}
                            categoryOptions={assetCategories}
                            showLocation
                            locationValue={selectedLocation}
                            onLocationChange={setSelectedLocation}
                            locationOptions={uniqueLocations}
                            showStatus
                            statusValue={selectedStatus}
                            onStatusChange={setSelectedStatus}
                            statusOptions={uniqueStatuses}
                            containerStyle={styles.topActionRow}
                            searchContainerStyle={styles.searchContainer}
                            searchInputStyle={styles.searchInput}
                            filtersContainerStyle={isMobileLayout ? styles.mobileFilterContainer : styles.filterGroup}
                            pickerWrapperStyle={styles.pickerWrapper}
                            pickerStyle={styles.pickerInternal}
                        />

                        {!isMobileLayout && (
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerCell, { width: 50, textAlign: 'center' }]}>S.No</Text>
                                <Text style={[styles.headerCell, { flex: 2 }]}>Asset Name</Text>
                                <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Barcode</Text>
                                <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Status</Text>
                                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Expected Due Date</Text>
                                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Assigned Date</Text>
                                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Assigned By</Text>
                                <Text style={[styles.headerCell, { flex: 1.5, textAlign: 'center' }]}>Action</Text>
                            </View>
                        )}

                        <FlatList
                            data={finalDisplayAssets}
                            keyExtractor={(item) => (item.id || item.assetId).toString()}
                            renderItem={renderAsset}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            // This ensures the FlatList fills the remaining body space
                            style={{ flex: 1 }}
                        />
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
            </SafeAreaView>
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
    backButton: { marginRight: 20, marginTop: 25 },
    headerTitle: { color: '#E6F3FF', fontSize: 20, fontWeight: 'bold', marginTop: 25 },
    body: { flex :1 ,paddingHorizontal: 15, padding: 20 },
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
                flexDirection : "row",
        gap: 12,
        marginBottom: 20,
        width: '100%',
    alignItems: 'stretch',
    },
    searchContainer: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48, // Fixed height for all top elements
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
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
        backgroundColor: 'rgba(18, 45, 73, 0.92)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.28)',
        minHeight: 46,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pickerInternal: {
        width: '100%',
        height: '100%',
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
    cellSNo: { width: 50, 
    alignItems: 'center', 
    justifyContent: 'center' },
    cellAssetName: { flex: 2, marginRight: 0 },
    assetName: { fontSize: 15, fontWeight: 'bold', color: '#E6F3FF' },
    assetSubtext: { fontSize: 12, color: '#A9C6E4', marginTop: 2 },
    cellBarcode: {  flex: 2, 
        alignItems: 'center',
        justifyContent: 'center', },
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
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(159, 207, 255, 0.22)',
        paddingBottom: 10,
        marginBottom: 10,
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