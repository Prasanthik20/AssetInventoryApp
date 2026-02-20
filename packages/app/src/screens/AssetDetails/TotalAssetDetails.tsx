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
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Asset, baseURL, RootStackParamList } from "../../navigation/types";
import OverdueNotificationModal from "../CommonScreen/OverdueNotificationModal";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isMobileDevice = Platform.OS !== 'web';

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

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [supervisorId, setSupervisorId] = useState<number | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);

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
    // --- RENDER FUNCTION IS NOW SEPARATE AND CLEAN ---
    const renderAsset = ({ item, index }: { item: Asset, index: number }) => {

        const isOverdue = item.status?.toLowerCase() === 'overdue';
        return (
            <View style={isMobileDevice ? styles.mobileCard : styles.assetRow}>
                {/* SERIAL NUMBER & ASSET INFO */}
                {/* <View style={[
                  styles.cardHeader,
                  !isMobileDevice && { borderBottomWidth: 0, marginBottom: 0, flex: 2.5, paddingLeft: 0 }
              ]}> */}
                {/* Wrap S.No in a fixed-width container for Web */}
                {isMobileDevice ?
                    <View style={{display: 'flex', flexDirection: 'column', justifyContent: "flex-start", gap: 10 }}>
                        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center',justifyContent: 'space-between', gap: 10,  }}>
                            <View style={!isMobileDevice ? { alignItems: 'center' } : {flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                <View style={styles.indexBadge}>
                                    <Text style={styles.indexText}>{index + 1}</Text>
                                </View>
                            {/* </View>
                            <View style={styles.cellAssetName}> */}
                                <Text style={styles.assetName}>{item.assetName}</Text>
                            </View>
                            <View style={styles.mobileBarcodeContainer}>
                                <MaterialCommunityIcons name="barcode" size={32} color="#666" />
                                <Text style={styles.mobileBarcodeText}> S/N: {item.serialNumber}</Text>
                            </View>
                        </View>
                        <View style={{ display: 'flex',flexDirection:"row", alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <View style={styles.cellStatus}>
                                <StatusBadge
                                    status={item.status ? item.status : null}
                                    assignedTo={item.assignedTo}
                                    location={item.location} />
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

                            <TouchableOpacity
                                style={[styles.actionButton, styles.knowMoreButton]}
                                onPress={() => navigation.navigate('AssetFullDetails', { asset: item })}
                            >
                                <Ionicons name="information-circle-outline" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Know More</Text>
                            </TouchableOpacity>
                        </View>
                    </View> :
                // WEB LAYOUT (ORIGINAL) 
                            <View>
                           
                        
                                <View style={{ display: 'flex', flexDirection: 'row', justifyContent:"space-between", alignItems: 'center', gap: 10 }}>
                                    <View style={!isMobileDevice ? { alignItems: 'center' } : null}>
                                        <View style={styles.indexBadge}>
                                            <Text style={styles.indexText}>{index + 1}</Text>
                                        </View>
                                    </View>
                                    <View style={[ !isMobileDevice ? { alignItems: 'center' } : null]}>
                                        <Text style={styles.assetName}>{item.assetName}</Text>

                                    </View>
                                    <View style={[styles.mobileBarcodeContainer, !isMobileDevice ? { alignItems: 'center' } : null]}>
                                        <MaterialCommunityIcons name="barcode" size={80} color="#666" />
                                        <Text style={styles.mobileBarcodeText}> S/N: {item.serialNumber}</Text>
                                    </View>

                                    <View style={{ display:"flex", flexDirection: "row", alignItems: 'center', gap: 10 }}>
                                        <View style={styles.cellStatus}>
                                            <StatusBadge
                                                status={item.status ? item.status : null}
                                                assignedTo={item.assignedTo}
                                                location={item.location} />
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

                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.knowMoreButton]}
                                        onPress={() => navigation.navigate('AssetFullDetails', { asset: item })}
                                    >
                                        <Ionicons name="information-circle-outline" size={18} color="#fff" />
                                        <Text style={styles.actionButtonText}>Know More</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                }


                {/* BARCODE (Moved to top right on mobile) */}
                {/* {isMobileDevice && ( */}

                {/* )} */}
                {/* </View> */}

                {/* <View style={isMobileDevice ? styles.mobileCardBody : {display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1}}> */}
                {/* STATUS BADGE */}
                {/* {!isMobileDevice && <Text style={styles.cellBarcode}>{item.barcode}</Text>} */}

                {/* <View style={isMobileDevice ? {display:"flex", flexDirection: "row", alignItems: "center"} : {display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', flex: 1}}> */}

                {/* <View style={styles.cellStatus}>
                    <StatusBadge
                        status={item.status ? item.status : null}
                        assignedTo={item.assignedTo}
                        location={item.location}
                    />
                </View> */}

                {/* ACTIONS */}
                {/* <View style={isMobileDevice ? styles.mobileActionRow : styles.cellAction}> */}


                {/* </View> */}
                {/* </View> */}
                {/* </View> */}
            </View>
        );
    };

    // --- LOADING AND ERROR CHECKS MOVED HERE (THE CORRECT LOCATION) ---
    if (loading) {
        return (
            <View style={styles.centeredView}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading Assets...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centeredView}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    // --- MAIN RETURN STATEMENT FOR THE COMPONENT ---
    return (
        <ImageBackground source={require("../../assets/Company-bg.webp")} style={styles.backgroundImage} resizeMode="cover" blurRadius={5}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#E0E0E0" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>All Company Assets</Text>
                    </View>
                    <View style={styles.body}>
                        <View style={styles.searchContainer}>
                            <Feather name="search" size={20} color="#999" style={styles.searchIcon} />
                            <TextInput placeholder="Search by name, barcode, or serial number..." placeholderTextColor="#999" style={styles.searchInput} />
                        </View>

                        { !isMobileDevice && (
                            <View style={{ display: 'flex', flexDirection: 'row', justifyContent:"space-between", alignItems: 'center',
                                
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)', }}>
                                <Text style={[styles.headerCell, styles.cellSNo]}>S.No</Text>
                                <Text style={[styles.headerCell, styles.cellAssetName]}>Asset Name</Text>
                                <Text style={[styles.headerCell, styles.cellBarcode]}>Barcode</Text>
                                <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                                <Text style={[styles.headerCell, styles.cellAction, { textAlign: 'center' }]}>Action</Text>
                            </View>
                        )} 
                        {/* --- DATA SOURCE CORRECTED --- */}
                        <FlatList
                            data={assets}
                            keyExtractor={(item) => (item.id || item.assetId || Math.random()).toString()}
                            renderItem={renderAsset}
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
    safeArea: { flex: 1 },
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
    backButton: { marginRight: 20, marginTop: 25 },
    headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 25 },
    body: { padding: 20 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        // Semi-transparent background for the search bar
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 48, fontSize: 15, color: '#1A202C', fontWeight: '500' },
    tableHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    headerCell: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1A202C', // Darker text for better contrast
    },
    assetRow: {
        // display: 'flex',
        // flexDirection: 'row',
        // alignItems: 'center',
        // Semi-transparent background for each row
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 10,
        minHeight: 70,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    cellSNo: { fontSize: 14, color: '#2D3748', fontWeight: '600' },
    cellAssetName: {  marginRight: 10 },
    assetName: { fontSize: 15, fontWeight: 'bold', color: '#1A202C' },
    assetSubtext: { fontSize: 12, color: '#4A5568', marginTop: 2 },
    cellBarcode: {  fontSize: 14, color: '#2D3748', fontWeight: '500' },
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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        elevation: 3,
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