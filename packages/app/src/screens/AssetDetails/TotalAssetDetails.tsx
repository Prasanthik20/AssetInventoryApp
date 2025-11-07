import React,{ useState } from 'react';
import { View, Text, StyleSheet, Alert,  SafeAreaView, ImageBackground, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';

// Define the navigation stack param list, including the new screen
export type RootStackParamList = {
    AssetsDetails: undefined;
    AssetFullDetails: { assetId: string }; // We will pass the asset ID to the details screen
};

type AssetsDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'AssetsDetails'>;

// --- NEW MOCK DATA FOR A CIVIL CONSTRUCTION COMPANY ---
const civilAssetsData = [
    {
        id: '1',
        serialNumber: 'EXC-001-2023',
        barcode: 'BAR456',
        assetName: 'Excavator',
        status: {
            type: 'Assigned',
            assignedTo: 'Jane Doe',
            location: 'Downtown Site, Block A',
        },
        assignedBy: 'John Smith (Supervisor)',
        purchaseDate: '2023-01-15',
        value: '$150,000',
    },
    {
        id: '2',
        serialNumber: 'CMX-007-2022',
        barcode: 'BAR789',
        assetName: 'Concrete Mixer',
        status: {
            type: 'Unassigned',
            location: 'Main Yard',
        },
        assignedBy: 'N/A',
        purchaseDate: '2022-05-20',
        value: '$15,000',
    },
    {
        id: '3',
        serialNumber: 'JHM-003-2023',
        barcode: 'BAR901',
        assetName: 'Jackhammer',
        status: {
            type: 'Overdue',
            assignedTo: 'Mike R.',
            location: 'Highway 4 Project',
        },
        assignedBy: 'John Smith (Supervisor)',
        purchaseDate: '2023-02-10',
        value: '$2,500',
    },
    {
        id: '4',
        serialNumber: 'SRV-002-2021',
        barcode: 'PROJ123',
        assetName: 'Surveying Theodolite',
        status: {
            type: 'Returned',
            location: 'In Company Warehouse',
        },
        assignedBy: 'N/A',
        purchaseDate: '2021-11-01',
        value: '$7,000',
    },
];

// Reusable component for displaying colored status badges
const StatusBadge = ({ status }: { status: typeof civilAssetsData[0]['status'] }) => {
    const getStatusStyle = () => {
        switch (status.type) {
            case 'Assigned': return { backgroundColor: '#E6F3FF', borderColor: '#007BFF', textColor: '#0056b3' };
            case 'Overdue': return { backgroundColor: '#FDEDED', borderColor: '#DC3545', textColor: '#a71d2a' };
            case 'Returned': return { backgroundColor: '#E9F7EF', borderColor: '#28A745', textColor: '#1c7430' };
            case 'Unassigned': return { backgroundColor: '#F8F9FA', borderColor: '#6C757D', textColor: '#495057' };
            default: return {};
        }
    };
    const { backgroundColor, borderColor, textColor } = getStatusStyle();

    return (
        <View style={[styles.statusContainer, { backgroundColor, borderColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>{status.type}</Text>
            <Text style={[styles.statusSubtext, { color: textColor }]}>
                {status.assignedTo ? `To: ${status.assignedTo}` : `At: ${status.location}`}
            </Text>
        </View>
    );
};


const TotalAssetsDetails: React.FC = () => {
    const navigation = useNavigation<AssetsDetailsNavigationProp>();

     const [isModalVisible, setModalVisible] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<{ id: string, name: string } | null>(null);

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

    const renderAsset = ({ item, index }: { item: typeof civilAssetsData[0], index: number }) => {
        const isOverdue = item.status.type === 'Overdue';

        return (
            <View style={styles.assetRow}>
                <Text style={styles.cellSNo}>{index + 1}</Text>
                <View style={styles.cellAssetName}>
                    <Text style={styles.assetName}>{item.assetName}</Text>
                    <Text style={styles.assetSubtext}>S/N: {item.serialNumber}</Text>
                </View>
                <Text style={styles.cellBarcode}>{item.barcode}</Text>
                <View style={styles.cellStatus}>
                    <StatusBadge status={item.status} />
                </View>
                
                {/* --- MODIFICATION START --- */}
                {/* This container now holds and aligns both buttons */}
                <View style={styles.cellAction}>
                    <View style={styles.actionButtonsContainer}>
                        {/* Conditionally render the "Notify" button ONLY if overdue */}
                        {isOverdue && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.notifyButton]}
                                onPress={() => handleOpenModal({ id: item.id, name: item.assetName })}
                            >
                                <Ionicons name="notifications-outline" size={14} color="#fff" />
                                <Text style={styles.actionButtonText}>Notify</Text>
                            </TouchableOpacity>
                        )}

                        {/* Always render the "Know More" button */}
                        <TouchableOpacity
                            style={[styles.actionButton, styles.knowMoreButton]}
                            onPress={() => navigation.navigate('AssetFullDetails', { assetId: item.id })}
                        >
                            <Text style={styles.actionButtonText}>Know More</Text>
                            <Ionicons name="arrow-forward" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* --- MODIFICATION END --- */}

            </View>
        );
    };

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

                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.cellSNo]}>S.No</Text>
                            <Text style={[styles.headerCell, styles.cellAssetName]}>Asset Name</Text>
                            <Text style={[styles.headerCell, styles.cellBarcode]}>Barcode</Text>
                            <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                            <Text style={[styles.headerCell, styles.cellAction, { textAlign: 'center' }]}>Action</Text>
                        </View>
                        
                        <FlatList
                            data={civilAssetsData}
                            renderItem={renderAsset}
                            keyExtractor={item => item.id}
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

});

export default TotalAssetsDetails;