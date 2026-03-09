import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Alert,
    SafeAreaView,
    ImageBackground,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
    useWindowDimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { StackNavigationProp } from "@react-navigation/stack";
import { Asset, baseURL, RootStackParamList } from "../../navigation/types";
import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";
import axios from "axios";
import { useAssetFilter } from "src/hooks/useAssetFilter";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
        let backgroundColor = '#F8F9FA';
        let borderColor = '#6C757D';
        let textColor = '#495057';

        switch (status?.toLowerCase()) {
            case 'assigned':
                backgroundColor = '#E6F3FF'; borderColor = '#007BFF'; textColor = '#0056b3';
                break;
            case 'overdue':
                backgroundColor = '#FDEDED'; borderColor = '#DC3545'; textColor = '#a71d2a';
                break;
            case 'returned':
                backgroundColor = '#E9F7EF'; borderColor = '#28A745'; textColor = '#1c7430';
                break;
            case 'unassigned':
                backgroundColor = '#F8F9FA'; borderColor = '#6C757D'; textColor = '#495057';
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
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const assetCategories = ["Battery", "Antenna", "Rover", "Controller"];

    const {
    searchText,
    setSearchText,
    selectedName,
    setSelectedName,
    selectedSerial,
    setSelectedSerial,
    selectedStatus,
    setSelectedStatus,
    filteredAssets,
    uniqueNames,
    uniqueSerialNumbers,
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
                Alert.alert("Success", "Notification sent successfully!");
                handleCloseModal();
                fetchAssets();
            }
        } catch (error: any) {
            console.error("API Error:", error.response?.data || error.message);
            Alert.alert("Error", error.response?.data?.message || "Failed to send notification");
        }
    };

    // Replace filteredAssets in your FlatList with this:
    const finalDisplayAssets = filteredAssets.filter((asset) => {
        if (!selectedName) return true;
        // This ensures "Antenna" matches "Antenna 01", "Antenna 02", etc.
        return asset.assetName?.toLowerCase().includes(selectedName.toLowerCase());
    });
    // --- RENDER FUNCTION IS NOW SEPARATE AND CLEAN ---
    const renderAsset = ({ item, index }: { item: Asset, index: number }) => {

        const isOverdue = item.status?.toLowerCase() === 'overdue';
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
                            <MaterialCommunityIcons name="barcode" size={32} color="#666" />
                            <Text style={styles.mobileBarcodeText}> S/N: {item.serialNumber}</Text>
                        </View>
                    </View>
                    
                    <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: 'space-between', marginTop: 15 }}>
                        <StatusBadge
                            status={item.status || null}
                            assignedTo={item.assignedTo}
                            location={item.location} 
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
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
                    <MaterialCommunityIcons name="barcode" size={40} color="#666" />
                    <Text style={styles.mobileBarcodeText}>S/N: {item.serialNumber}</Text>
                </View>

                <View style={[styles.cellStatus, { flex: 2, alignItems: 'center' }]}>
                    <StatusBadge
                        status={item.status || null}
                        assignedTo={item.assignedTo}
                        location={item.location} 
                    />
                </View>

                <View style={[styles.cellAction, { flex: 1.5, flexDirection: 'row', gap: 10, justifyContent: 'center' }]}>
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
                        <View style={[styles.topActionRow, isMobileLayout && { flexDirection: 'column' }]}>
                            <View style={styles.searchContainer}>
                                <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
                                <TextInput 
                                    placeholder="Search by name, barcode..." 
                                    placeholderTextColor="#888" 
                                    style={styles.searchInput}
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />  
                            </View>

                           <View style={isMobileLayout ? styles.mobileFilterContainer : styles.filterGroup}>
                               <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={selectedName}
                                        onValueChange={setSelectedName}
                                        style={styles.pickerInternal}
                                    >
                                        <Picker.Item label="All Categories" value="" />
                                        {assetCategories.map((cat) => (
                                            <Picker.Item key={cat} label={cat} value={cat} />
                                        ))}
                                    </Picker>
                                </View>
                                <View style={isMobileLayout ? styles.mobileFilterSubRow : styles.desktopFilterSubRow}>
                                <View style={styles.pickerWrapper}>
                                    <Picker selectedValue={selectedSerial} onValueChange={setSelectedSerial} style={styles.pickerInternal}>
                                        <Picker.Item label="All Serials" value="" />
                                        {uniqueSerialNumbers.map((s) => <Picker.Item key={s} label={s!} value={s!} />)}
                                    </Picker>
                                </View>
                                <View style={styles.pickerWrapper}>
                                    <Picker selectedValue={selectedStatus} onValueChange={setSelectedStatus} style={styles.pickerInternal}>
                                        <Picker.Item label="All Status" value="" />
                                        {uniqueStatuses.map((st) => <Picker.Item key={st} label={st!} value={st!} />)}
                                    </Picker>
                                </View>
                            </View>
                        </View>
                    </View>

                        {!isMobileLayout && (
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerCell, { width: 50, textAlign: 'center' }]}>S.No</Text>
                                <Text style={[styles.headerCell, { flex: 2 }]}>Asset Name</Text>
                                <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Barcode</Text>
                                <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Status</Text>
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
            </SafeAreaView>
        </ImageBackground>
    );
};


// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    safeArea: { flex: 1, backgroundColor: "rgba(61, 138, 233, 0.4)" },
    // Container is now the full screen
    container: {
        flex: 1,
        // The background is now semi-transparent to show the image behind it
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        // Made header semi-transparent as well
        backgroundColor: 'rgba(60, 60, 80, 0.7)',
        paddingVertical: 15,
        paddingHorizontal: 20,
        // No border radius needed for a full-width header
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        ...Platform.select({
        web: {
            outlineStyle: 'none',
            cursor: 'pointer',
        } as any,
    }),
    },
    backButton: { marginRight: 20, marginTop: 25 },
    headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 25 },
    body: { flex :1 ,paddingHorizontal: 15, padding: 20 },
    searchIcon: { marginRight: 10 },
    tableHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
    },
    searchContainer: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48, // Fixed height for all top elements
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        height: 42,
        justifyContent: 'center',
        overflow: 'hidden', // Clips the default picker border
    },
    pickerInternal: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        borderWidth: 0,
        fontSize: 13,
        color: '#444',
        paddingHorizontal: 8,
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
        color: '#1A202C', // Darker text for better contrast
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    cellSNo: { width: 50, 
    alignItems: 'center', 
    justifyContent: 'center' },
    cellAssetName: {  marginRight: 10 },
    assetName: { fontSize: 15, fontWeight: 'bold', color: '#1A202C' },
    assetSubtext: { fontSize: 12, color: '#4A5568', marginTop: 2 },
    cellBarcode: {  flex: 2, 
        alignItems: 'center',
        justifyContent: 'center', },
    cellStatus: {  },
    statusContainer: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
    },
    statusText: { fontSize: 13, fontWeight: 'bold' },
    statusSubtext: { fontSize: 11, marginTop: 2 },
    knowMoreText: { color: '#fff', fontSize: 13, fontWeight: '600', marginRight: 5 },
    cellAction: {
        // flex: 1.5, // Give more space for two buttons
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3C4048', // A dark background
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#FFFFFF',
    },
    errorText: {
        fontSize: 18,
        color: '#DC3545',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    mobileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        // Shadow for Android
        elevation: 3,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 10,
        marginBottom: 10,
    },
    indexBadge: {
        backgroundColor: '#3B59B8',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    indexText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    mobileBarcodeContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    mobileBarcodeText: { fontSize: 12, color: '#666', marginLeft: 4, fontWeight: '600' },
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
        backgroundColor: '#5A67D8',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
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

});

export default TotalAssetsDetails;