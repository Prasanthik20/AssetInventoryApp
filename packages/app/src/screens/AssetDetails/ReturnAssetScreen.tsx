import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, Platform,ImageBackground, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { Asset, baseURL, RootStackParamList } from '../../navigation/types';

const isMobileDevice = Platform.OS !== 'web';

type ReturnAssetRouteProp = RouteProp<RootStackParamList, 'ReturnAsset'>;

const ReturnAssetScreen: React.FC = () => {
    const route = useRoute<ReturnAssetRouteProp>();
    const { assets, operatorEmployeeId } = route.params;
    const navigation = useNavigation<any>();
    const employeeId = Number(operatorEmployeeId);
    const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
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

    const toggleAssetSelection = (id: number) => {
        setSelectedAssets(current =>
            current.includes(id)
                ? current.filter(aid => aid !== id)
                : [...current, id]
        );
    };



    const getAssetStatus = (expectedReturnDate?: string) => {
        if (!expectedReturnDate) return 'No due date';
        return new Date(expectedReturnDate) < new Date()
            ? 'Overdue'
            : 'Due soon';
    };

    const handleReturn = async () => {
        if (!employeeId || isNaN(employeeId)) {
            Alert.alert("Error", "Invalid operator employee ID.");
            return;
        }

        if (selectedAssets.length === 0) {
            Alert.alert("No Assets Selected", "Please select at least one asset to return.");
            return;
        }

        try {
            const payload = {
                assetIds: assets
                    .filter(a => selectedAssets.includes(a.assignmentId))
                    .map(a => a.assetId),
                operatorEmployeeId: employeeId,
            };

            console.log("RETURN PAYLOAD 👉", payload);

            const response = await axios.post(
                    `${baseURL}/api/operator/returnAsset`,
                payload
            );

            console.log("RETURN RESPONSE 👉", response.data);

            if (response.status === 200) {
            // Alert should be triggered here
            Alert.alert(
                "Success ✅",
                "Assets returned successfully",
                [
                    { 
                        text: "OK", 
                        onPress: () => {
                            // Small delay ensures DB is updated before Dashboard re-fetches
                            setTimeout(() => navigation.navigate("OperatorDashboard", { refresh: Date.now() }), 500);
                        } 
                    }
                ]
            );
        }
        } catch (error: any) {
            console.error("Return asset error:", error?.response?.data || error.message);

            Alert.alert(
                "Error ❌",
                error?.response?.data?.message || "Failed to return assets."
            );
        }
    };


    const renderAssetItem = (item: Asset) => {
        const id = item.assignmentId; // ✅ UNIQUE & SAFE
        const isSelected = selectedAssets.includes(id);

        return (
            <TouchableOpacity
            key={id.toString()} // Required for .map()
                style={[styles.assetRow, isSelected && styles.assetRowSelected]}
                onPress={() => toggleAssetSelection(id)}
            >
                <Ionicons
                    name={isSelected ? 'checkbox' : 'checkbox-outline'}
                    size={24}
                    color={isSelected ? '#3B59B8' : '#888'}
                    style={styles.checkboxIcon}
                />

                <View style={styles.assetInfo}>
                    <Text style={styles.assetName}>
                        {item.assetName} {item.barcode ? `(${item.barcode})` : ''}
                    </Text>
                </View>

                <View style={styles.statusActionContainer}>
                    <Text
                        style={[
                            styles.assetStatus,
                            item.isOverdue && styles.assetStatusOverdue,
                        ]}
                    >
                        {item.status}
                    </Text>

                    {item.isOverdue && (
                        <TouchableOpacity
                            style={styles.notifyButton}
                            onPress={() => handleOpenModal(item.assetName)}
                        >
                            <Ionicons
                                name="notifications-outline"
                                size={16}
                                color="#DC3545"
                            />
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
                <View style={[styles.container, isMobileDevice && { margin: 10, borderRadius: 15 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#1A202C" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Select Assets to Return</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Content Body */}
                    <ScrollView 
                        style={styles.body} 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={isMobileDevice ? { paddingBottom: 20 } : { flex: 1 }}
                    >
                        <View style={[styles.formBody, isMobileDevice && { flexDirection: 'column', gap: 15 }]}>
                            {/* Left Column - Asset List */}
                            <View style={styles.formColumn}>
                                <Text style={styles.instructions}>
                                    Select one or more assets you wish to return.
                                </Text>
                                {isMobileDevice ? (
                                    // 2. MOBILE FIX: Pass item directly to the updated function
                                    assets.map((item) => renderAssetItem(item))
                                ) : (
                                    // 3. WEB FIX: Destructure 'item' from FlatList and pass it to function
                                    <FlatList
                                        data={assets}
                                        renderItem={({ item }) => renderAssetItem(item)}
                                        keyExtractor={(item) => item.assignmentId.toString()}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}
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
                    </ScrollView>

                    {/* Footer with actions */}
                    <View style={[styles.footer, isMobileDevice && { justifyContent: 'space-between' }]}>
                        <TouchableOpacity 
                            style={[styles.cancelButton, isMobileDevice && { flex: 1, marginRight: 10 }]} 
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={isMobileDevice && { flex: 2 }} 
                            onPress={handleReturn}>
                            <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.returnButton}>
                                <Text style={styles.buttonText}>
                                    Return ({selectedAssets.length})
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
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
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
    backButton: { position: 'absolute', left: 20, marginTop : 20 },
    headerTitle: { color: '#1A202C', fontSize: 20, fontWeight: 'bold', marginTop : 20 },
    body: { flex: 1, 
        paddingHorizontal: Platform.OS !== 'web' ? 15 : 25,
        paddingTop: 15},
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
        padding: 12, // Reduced padding for mobile
        marginBottom: 10,
        elevation: 2, // Added shadow for better separation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    assetRowSelected: {
        borderColor: '#4A55A2',
        backgroundColor: '#E9EAFE',
    },
    checkboxIcon: { marginRight: 15 },
    assetInfo: { flex: 1 },
    assetName: { fontSize: 15, 
        fontWeight: '600', 
        color: '#1A202C',
        flexShrink: 1 },// Prevents pushing content off screen },
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
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    returnButton: { paddingVertical: 14, // Taller for mobile touch
        paddingHorizontal: 20, 
        borderRadius: 10, 
        alignItems: 'center' },
    cancelButton: { paddingVertical: 14, 
        paddingHorizontal: 20, 
        borderRadius: 10, 
        backgroundColor: '#E2E8F0',
        alignItems: 'center'},
    buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default ReturnAssetScreen;