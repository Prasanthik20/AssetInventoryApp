import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, ImageBackground, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Asset,AssignedAsset, RootStackParamList } from '../../navigation/types';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import axios from 'axios';


interface Status {
    id: number;
    status: string;
}

// Define the navigation stack param list
type AssetsDetailsNavigationProp = StackNavigationProp<
    RootStackParamList,
    'TotalAssetDetails'
>;

const StatusBadge = ({
    status,
    assignedTo,
    assignedBy,
    location
}: {
    status: string;
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
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(`http://localhost:3000/api/assets`);
                setAssets(response.data.assets);
            } catch (err) {
                setError('Failed to fetch assets. Please check the server connection.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
    }, []);

    const handleOpenModal = (asset: { id: string, name: string }) => {
        setSelectedAsset(asset);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedAsset(null);
    };

    const handleSubmitNotification = (reason: string) => {
        if (!selectedAsset) return;
        console.log(`Sending notification for asset "${selectedAsset.name}" with reason: ${reason}`);
        Alert.alert(
            "Notification Sent",
            `A notification regarding "${selectedAsset.name}" has been sent.`,
            [{ text: "OK", onPress: handleCloseModal }]
        );
    };

    // --- RENDER FUNCTION IS NOW SEPARATE AND CLEAN ---
   const renderAsset = ({ item, index }: { item: Asset, index: number }) => { 
    
    const isOverdue = item.status?.toLowerCase() === 'overdue';
        return (
        <View style={styles.assetRow}>
            <Text style={styles.cellSNo}>{index + 1}</Text>

            <View style={styles.cellAssetName}>
                <Text style={styles.assetName}>{item.assetName}</Text>
                <Text style={styles.assetSubtext}>S/N: {item.serialNumber}</Text>
            </View>

            <Text style={styles.cellBarcode}>{item.barcode}</Text>

            <View style={styles.cellStatus}>
                <StatusBadge
                    status={item.status}
                    assignedTo={item.assignedTo}
                    assignedBy={item.assignedBy}
                    location={item.location}
                />
            </View>

            <View style={styles.cellAction}>
                <View style={styles.actionButtonsContainer}>

                    {isOverdue && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.notifyButton]}
                            onPress={() => handleOpenModal({ id: item.assetId.toString(), name: item.assetName })}
                        >
                            <Ionicons name="notifications-outline" size={14} color="#fff" />
                            <Text style={styles.actionButtonText}>Notify</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, styles.knowMoreButton]}
                        onPress={() => navigation.navigate('AssetFullDetails', { asset: item })}
                    >
                        <Text style={styles.actionButtonText}>Know More</Text>
                        <Ionicons name="arrow-forward" size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
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

                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.cellSNo]}>S.No</Text>
                            <Text style={[styles.headerCell, styles.cellAssetName]}>Asset Name</Text>
                            <Text style={[styles.headerCell, styles.cellBarcode]}>Barcode</Text>
                            <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                            <Text style={[styles.headerCell, styles.cellAction, { textAlign: 'center' }]}>Action</Text>
                        </View>
                        
                        {/* --- DATA SOURCE CORRECTED --- */}
                        <FlatList
                            data={assets}
                            renderItem={renderAsset}
                            keyExtractor={(item, index) => (item.assetId || index).toString()}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
                 {selectedAsset && (
                    <OverdueNotificationModal
                        visible={isModalVisible}
                        onClose={handleCloseModal}
                        onSubmit={handleSubmitNotification}
                        assetName={selectedAsset.name}
                    />
                )}
            </SafeAreaView>
        </ImageBackground>
    );
};


// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
    backgroundImage: { flex: 1,
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
    backButton: { marginRight: 20 },
    headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    body: { flex: 1, padding: 20 },
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
        flexDirection: 'row',
        alignItems: 'center',
        // Semi-transparent background for each row
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        minHeight: 70,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    cellSNo: { flex: 0.5, fontSize: 14, color: '#2D3748', fontWeight: '600' },
    cellAssetName: { flex: 2, marginRight: 10 },
    assetName: { fontSize: 15, fontWeight: 'bold', color: '#1A202C' },
    assetSubtext: { fontSize: 12, color: '#4A5568', marginTop: 2 },
    cellBarcode: { flex: 1, fontSize: 14, color: '#2D3748', fontWeight: '500' },
    cellStatus: { flex: 2, alignItems: 'flex-start' },
    statusContainer: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
    },
    statusText: { fontSize: 13, fontWeight: 'bold' },
    statusSubtext: { fontSize: 11, marginTop: 2 },
    knowMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5A67D8', // Adjusted button color
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    knowMoreText: { color: '#fff', fontSize: 13, fontWeight: '600', marginRight: 5 },
    cellAction: {
        flex: 1.5, // Give more space for two buttons
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
    notifyButton: {
        backgroundColor: '#DC3545', // Red color for notify
        marginRight: 8, // Add space between the buttons
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12, // Smaller font
        fontWeight: '600',
        marginLeft: 4, // Space between icon and text
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

});

export default TotalAssetsDetails;