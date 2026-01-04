import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { Asset, RootStackParamList } from '../../navigation/types';

type LocalRootStackParamList = {
    OperatorDashboard: {
        operatorName: string;
        roleName: string;
        employeeId: string;
    };
    ReturnAsset: {
        assets: any[];
        employeeId: string;
    };
};

type ReturnAssetRouteProp = RouteProp<LocalRootStackParamList, 'ReturnAsset'>;


const ReturnAssetScreen: React.FC = () => {
    const route = useRoute<ReturnAssetRouteProp>();
    const { assets } = route.params;
    const navigation = useNavigation<any>();
    const employeeId = parseInt(route.params.employeeId, 10);
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOverdueAsset, setSelectedOverdueAsset] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);

    // --- Modal Handler Functions ---
    const handleOpenModal = (assetName: string) => {
        setSelectedOverdueAsset(assetName);
        setModalVisible(true);
    };
    const handleCloseModal = () => setModalVisible(false);
    const handleSubmitNotification = (reason: string) => {
        console.log(`Reason for overdue asset "${selectedOverdueAsset}": ${reason}`);
        Alert.alert("Notification Sent", "Your supervisor has been notified.");
        handleCloseModal();
    };

    // --- Button Action Handlers ---
    const handleScanBarcode = () => Alert.alert("Scan Barcode", "Camera functionality for scanning returns would be implemented here.");
    const handleUploadPhoto = () => Alert.alert("Upload Photo", "Image library to upload proof of asset condition would be implemented here.");

    const toggleAssetSelection = (id: string | number) => {
        const assetId = typeof id === 'string' ? id : id.toString();
        setSelectedAssets(current =>
            current.includes(assetId) ? current.filter(aid => aid !== assetId) : [...current, assetId]
        );
    };

    const getAssetStatus = (expectedReturnDate?: string) => {
        if (!expectedReturnDate) return 'No due date';
        return new Date(expectedReturnDate) < new Date()
            ? 'Overdue'
            : 'Due soon';
    };
   const handleReturn = async () => {
    if (selectedAssets.length === 0) {
        Alert.alert("No Assets Selected", "Please select at least one asset to return.");
        return;
    }

    try {
        const response = await axios.post(
            "http://localhost:3000/api/operator/returnAsset",
            {
                assetIds: selectedAssets.map(id => parseInt(id, 10)),
                employeeId: employeeId,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    // Example: Authorization header if needed
                    // 'Authorization': `Bearer ${token}`,
                },
                // Optional: include credentials for cookies
                // withCredentials: true,
            }
        );

        Alert.alert("Success", response.data.message, [
            { text: "OK", onPress: () => navigation.goBack() },
        ]);
    } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to return assets. Please try again.");
    }
};

    const renderAssetItem = ({ item }: { item: typeof assets[0] }) => {
        const isSelected = selectedAssets.includes(item.id);
        const isOverdue = item.status === 'Overdue';

        return (
            <TouchableOpacity
                style={[styles.assetRow, isSelected && styles.assetRowSelected]}
                onPress={() => toggleAssetSelection(item.id)}
            >
                <Ionicons
                    name={isSelected ? 'checkbox' : 'checkbox-outline'}
                    size={24}
                    color={isSelected ? '#3B59B8' : '#888'}
                    style={styles.checkboxIcon}
                />
                <View style={styles.assetInfo}>
                    <Text style={styles.assetName}>{item.name} ({item.barcode})</Text>
                </View>
                <View style={styles.statusActionContainer}>
                    <Text style={[styles.assetStatus, isOverdue && styles.assetStatusOverdue]}>
                        {item.status}
                    </Text>
                    {isOverdue && (
                        <TouchableOpacity style={styles.notifyButton} onPress={() => handleOpenModal(item.name)}>
                            <Ionicons name="notifications-outline" size={16} color="#DC3545" />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ImageBackground
            source={require("../../assets/Company-bg.webp")}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={10}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#1A202C" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Select Assets to Return</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Content Body */}
                    <View style={styles.body}>
                        <View style={styles.formBody}>
                            {/* Left Column - Asset List */}
                            <View style={styles.formColumn}>
                                <Text style={styles.instructions}>
                                    Select one or more assets you wish to return.
                                </Text>
                                <FlatList
                                    data={assets}
                                    renderItem={renderAssetItem}
                                    keyExtractor={(item, index) => `${item.id ?? index}-${index}`}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>

                            {/* Right Column - Actions */}
                            <View style={styles.formColumn}>
                                <Text style={styles.label}>Scan to Add</Text>
                                <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode}>
                                    <MaterialCommunityIcons name="barcode-scan" size={24} color="#fff" />
                                    <Text style={styles.scanButtonText}>Scan Asset Barcode</Text>
                                </TouchableOpacity>

                                <Text style={styles.label}>Proof of Condition</Text>
                                <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto}>
                                    <Feather name="camera" size={20} color="#4A5568" />
                                    <Text style={styles.uploadButtonText}>
                                        {photo ? 'Photo Uploaded' : 'Tap to upload a photo'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Footer with actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                            <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleReturn}>
                            <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.returnButton}>
                                <Text style={styles.buttonText}>
                                    Return Selected ({selectedAssets.length})
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                <OverdueNotificationModal
                    visible={modalVisible}
                    onClose={handleCloseModal}
                    onSubmit={handleSubmitNotification}
                    assetName={selectedOverdueAsset}
                />
            </SafeAreaView>
        </ImageBackground>
    );
};

// --- STYLES REVISED FOR NEW LAYOUT AND CLEAN AESTHETIC ---
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    safeArea: { flex: 1 },
    container: {
        flex: 1,
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    backButton: { position: 'absolute', left: 20 },
    headerTitle: { color: '#1A202C', fontSize: 20, fontWeight: 'bold' },
    body: { flex: 1, padding: 25 },
    formBody: { flexDirection: 'row', gap: 25, flex: 1 },
    formColumn: { flex: 1 },
    instructions: {
        fontSize: 15,
        color: '#4A5568',
        marginBottom: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    assetRowSelected: {
        borderColor: '#4A55A2',
        backgroundColor: '#E9EAFE',
    },
    checkboxIcon: { marginRight: 15 },
    assetInfo: { flex: 1 },
    assetName: { fontSize: 16, fontWeight: '600', color: '#1A202C' },
    statusActionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    assetStatus: { fontSize: 14, color: '#4A5568', fontWeight: '500' },
    assetStatusOverdue: { color: '#DC3545', fontWeight: 'bold' },
    notifyButton: {
        marginLeft: 10,
        padding: 5,
    },
    label: {
        fontSize: 14,
        color: '#2D3748',
        marginBottom: 8,
        fontWeight: '600',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A55A2',
        borderRadius: 10,
        paddingVertical: 14,
        marginBottom: 20,
    },
    scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 10 },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EDF2F7',
        borderRadius: 10,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#CBD5E0',
    },
    uploadButtonText: { color: '#4A5568', fontSize: 15, fontWeight: '500', marginLeft: 10 },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    returnButton: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, marginLeft: 15 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, backgroundColor: '#E2E8F0' },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default ReturnAssetScreen;