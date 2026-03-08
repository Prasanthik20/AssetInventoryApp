import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, Platform,ImageBackground, ScrollView, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
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
    const [barcodeURL, setBarcodeURL] = useState<string | null>(null);
    const [assetPhotoMap, setAssetPhotoMap] = useState<Record<string, string>>({});
    const [assetBarcodeMap, setAssetBarcodeMap] = useState<Record<string, string>>({});
    const [assetPhotoLoadingMap, setAssetPhotoLoadingMap] = useState<Record<string, boolean>>({});
    const [assetBarcodeLoadingMap, setAssetBarcodeLoadingMap] = useState<Record<string, boolean>>({});
    const [photoLoading, setPhotoLoading] = useState(false);
    const [barcodeLoading, setBarcodeLoading] = useState(false);

    const toAssetId = (value: unknown) => Number(value);
    const toAssetKey = (value: unknown) => String(toAssetId(value));
    const toAssignmentId = (value: unknown) => Number(value);

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
    const handleScanBarcode = async (targetAssetId?: number | string) => {
        const hasTargetAsset =
            targetAssetId !== undefined &&
            targetAssetId !== null &&
            !Number.isNaN(toAssetId(targetAssetId));
        const targetKey = hasTargetAsset ? toAssetKey(targetAssetId) : null;

        try {
            if (hasTargetAsset && targetKey) {
                setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
            } else {
                setBarcodeLoading(true);
            }

            if (Platform.OS === 'web') {
                // Web fallback: use file picker for barcode/QR image capture.
                await handleUploadBarcode(targetAssetId);
                return;
            }

            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to scan QR/barcode.');
                if (hasTargetAsset && targetKey) {
                    setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
                } else {
                    setBarcodeLoading(false);
                }
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const base64 = result.assets[0].base64;

                if (base64) {
                    const barcodeData = `data:image/jpeg;base64,${base64}`;
                    if (hasTargetAsset && targetKey) {
                        setAssetBarcodeMap((prev) => ({ ...prev, [targetKey]: barcodeData }));
                        Alert.alert('✅ Barcode Captured', 'Captured barcode saved for selected asset.');
                    } else {
                        setBarcodeURL(barcodeData);
                        Alert.alert('✅ Barcode Captured', 'Captured barcode image will be attached to the return.');
                    }
                } else {
                    Alert.alert('Error', 'Failed to process captured image. Please try again.');
                }
            }
        } catch (error) {
            console.error('Barcode camera error:', error);
            Alert.alert('Error', 'Failed to open camera.');
        } finally {
            if (hasTargetAsset && targetKey) {
                setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
            } else {
                setBarcodeLoading(false);
            }
        }
    };
    
    const handleUploadPhoto = async (targetAssetId?: number | string) => {
        const hasTargetAsset =
            targetAssetId !== undefined &&
            targetAssetId !== null &&
            !Number.isNaN(toAssetId(targetAssetId));
        const targetKey = hasTargetAsset ? toAssetKey(targetAssetId) : null;

        try {
            if (hasTargetAsset && targetKey) {
                setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
            } else {
                setPhotoLoading(true);
            }

            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera roll permission is required to upload photos.');
                if (hasTargetAsset && targetKey) {
                    setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
                } else {
                    setPhotoLoading(false);
                }
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const base64 = asset.base64;

                if (base64) {
                    const photoURL = `data:image/jpeg;base64,${base64}`;
                    if (hasTargetAsset && targetKey) {
                        setAssetPhotoMap((prev) => ({ ...prev, [targetKey]: photoURL }));
                        Alert.alert('✅ Photo Selected', 'Photo saved for selected asset.');
                    } else {
                        setPhoto(photoURL);
                        Alert.alert('✅ Photo Selected', 'Photo will be attached to the return.');
                    }
                } else {
                    Alert.alert('Error', 'Failed to process image. Please try again.');
                }
            }
        } catch (error) {
            console.error('Photo picker error:', error);
            Alert.alert('Error', 'Failed to open image library.');
        } finally {
            if (hasTargetAsset && targetKey) {
                setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
            } else {
                setPhotoLoading(false);
            }
        }
    };

    const handleUploadBarcode = async (targetAssetId?: number | string) => {
        const hasTargetAsset =
            targetAssetId !== undefined &&
            targetAssetId !== null &&
            !Number.isNaN(toAssetId(targetAssetId));
        const targetKey = hasTargetAsset ? toAssetKey(targetAssetId) : null;

        try {
            if (hasTargetAsset && targetKey) {
                setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
            } else {
                setBarcodeLoading(true);
            }

            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera roll permission is required to upload barcode image.');
                if (hasTargetAsset && targetKey) {
                    setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
                } else {
                    setBarcodeLoading(false);
                }
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const base64 = result.assets[0].base64;

                if (base64) {
                    const barcodeData = `data:image/jpeg;base64,${base64}`;
                    if (hasTargetAsset && targetKey) {
                        setAssetBarcodeMap((prev) => ({ ...prev, [targetKey]: barcodeData }));
                        Alert.alert('✅ Barcode Selected', 'Barcode saved for selected asset.');
                    } else {
                        setBarcodeURL(barcodeData);
                        Alert.alert('✅ Barcode Selected', 'Barcode image will be attached to the return.');
                    }
                } else {
                    Alert.alert('Error', 'Failed to process barcode image. Please try again.');
                }
            }
        } catch (error) {
            console.error('Barcode picker error:', error);
            Alert.alert('Error', 'Failed to open image library.');
        } finally {
            if (hasTargetAsset && targetKey) {
                setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
            } else {
                setBarcodeLoading(false);
            }
        }
    };

    const toggleAssetSelection = (id: number) => {
        setSelectedAssets(current => {
            const isSelected = current.includes(id);
            if (isSelected) {
                const removedAsset = assets.find((asset) => toAssignmentId(asset.assignmentId) === id);
                if (removedAsset) {
                    const assetKey = toAssetKey(removedAsset.assetId);
                    setAssetPhotoMap((prev) => {
                        const next = { ...prev };
                        delete next[assetKey];
                        return next;
                    });
                    setAssetBarcodeMap((prev) => {
                        const next = { ...prev };
                        delete next[assetKey];
                        return next;
                    });
                }
                return current.filter(aid => aid !== id);
            }

            return [...current, id];
        });
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

        const selectedAssetRows = assets.filter((a) => selectedAssets.includes(toAssignmentId(a.assignmentId)));
        if (selectedAssetRows.length > 1) {
            const missing = selectedAssetRows.filter(
                (asset) => {
                    const key = toAssetKey(asset.assetId);
                    return !assetPhotoMap[key] || !assetBarcodeMap[key];
                }
            );

            if (missing.length > 0) {
                Alert.alert(
                    'Media Required',
                    'Please upload both photo and barcode for each selected asset.'
                );
                return;
            }
        }

        try {
            const payload = {
                assetIds: selectedAssetRows.map((a) => toAssetId(a.assetId)),
                operatorEmployeeId: employeeId,
                assetMedia: selectedAssetRows.map((asset) => ({
                    assetId: toAssetId(asset.assetId),
                    // Send only media selected in this return flow to keep request payload small.
                    photoURL: assetPhotoMap[toAssetKey(asset.assetId)] || photo || null,
                    barcodeURL: assetBarcodeMap[toAssetKey(asset.assetId)] || barcodeURL || null,
                })),
                ...(photo && { photoURL: photo }), // Include photo if available
                ...(barcodeURL && { barcodeURL }),
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
            navigation.goBack();
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
        const id = toAssignmentId(item.assignmentId); // ✅ UNIQUE & SAFE
        if (Number.isNaN(id)) {
            return null;
        }
        const isSelected = selectedAssets.includes(id);

        return (
            <TouchableOpacity
            key={String(id)} // Required for .map()
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
                                        keyExtractor={(item) => String(toAssignmentId(item.assignmentId))}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}
                            </View>

                            {/* Right Column - Actions */}
                            <View style={styles.formColumn}>
                                {selectedAssets.length > 1 ? (
                                    <>
                                        <Text style={styles.label}>Upload Per Asset (Required for Multi-Select)</Text>
                                        <Text style={styles.helperText}>Each selected asset needs both a photo and barcode image.</Text>
                                        {assets
                                            .filter((asset) => selectedAssets.includes(toAssignmentId(asset.assignmentId)))
                                            .map((asset) => {
                                                const assetKey = toAssetKey(asset.assetId);
                                                const currentPhoto = assetPhotoMap[assetKey] || null;
                                                const currentBarcode = assetBarcodeMap[assetKey] || null;
                                                const isPhotoLoading = assetPhotoLoadingMap[assetKey] || false;
                                                const isBarcodeLoading = assetBarcodeLoadingMap[assetKey] || false;

                                                return (
                                                    <View key={`return-media-${asset.assignmentId}`} style={styles.mediaCard}>
                                                        <Text style={styles.mediaCardTitle}>{asset.assetName}</Text>
                                                        <TouchableOpacity
                                                            style={styles.uploadButton}
                                                            onPress={() => handleUploadPhoto(asset.assetId)}
                                                            disabled={isPhotoLoading}
                                                        >
                                                            {isPhotoLoading ? (
                                                                <ActivityIndicator color="#4A5568" size="small" />
                                                            ) : (
                                                                <>
                                                                    <Feather name="camera" size={20} color="#4A5568" />
                                                                    <Text style={styles.uploadButtonText}>
                                                                        {currentPhoto ? '✓ Photo Uploaded' : 'Upload Photo'}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.uploadButton}
                                                            onPress={() => handleScanBarcode(asset.assetId)}
                                                            disabled={isBarcodeLoading}
                                                        >
                                                            {isBarcodeLoading ? (
                                                                <ActivityIndicator color="#4A5568" size="small" />
                                                            ) : (
                                                                <>
                                                                    <MaterialCommunityIcons name="barcode-scan" size={20} color="#4A5568" />
                                                                    <Text style={styles.uploadButtonText}>
                                                                        {currentBarcode ? '✓ Barcode Uploaded' : 'Scan/Upload Barcode'}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                    </>
                                ) : (
                                    <>
                                
                                        <Text style={styles.label}>Proof of Condition</Text>
                                        <TouchableOpacity
                                            style={styles.uploadButton}
                                            onPress={() => handleUploadPhoto()}
                                            disabled={photoLoading}
                                        >
                                            {photoLoading ? (
                                                <ActivityIndicator color="#4A5568" size="small" />
                                            ) : (
                                                <>
                                                    <Feather name="camera" size={20} color="#4A5568" />
                                                    <Text style={styles.uploadButtonText}>
                                                        {photo ? '✓ Photo Uploaded' : 'Tap to upload a photo'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {photo && (
                                            <View style={styles.photoPreviewContainer}>
                                                <Image
                                                    source={{ uri: photo }}
                                                    style={styles.photoPreview}
                                                    resizeMode="cover"
                                                />
                                                <TouchableOpacity
                                                    style={styles.removePhotoButton}
                                                    onPress={() => {
                                                        setPhoto(null);
                                                        Alert.alert('Removed', 'Photo has been removed.');
                                                    }}
                                                >
                                                    <Ionicons name="close" size={20} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        <Text style={styles.label}>Upload Barcode (Optional)</Text>
                                        <TouchableOpacity
                                            style={styles.uploadButton}
                                            onPress={() => handleUploadBarcode()}
                                            disabled={barcodeLoading}
                                        >
                                            {barcodeLoading ? (
                                                <ActivityIndicator color="#4A5568" size="small" />
                                            ) : (
                                                <>
                                                    <MaterialCommunityIcons name="barcode" size={20} color="#4A5568" />
                                                    <Text style={styles.uploadButtonText}>
                                                        {barcodeURL ? '✓ Barcode Uploaded' : 'Tap to upload barcode image'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {barcodeURL && (
                                            <View style={styles.photoPreviewContainer}>
                                                <Image
                                                    source={{ uri: barcodeURL }}
                                                    style={styles.photoPreview}
                                                    resizeMode="contain"
                                                />
                                                <TouchableOpacity
                                                    style={styles.removePhotoButton}
                                                    onPress={() => {
                                                        setBarcodeURL(null);
                                                        Alert.alert('Removed', 'Barcode image has been removed.');
                                                    }}
                                                >
                                                    <Ionicons name="close" size={20} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}
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
    safeArea: { flex: 1 ,backgroundColor: "rgba(61, 138, 233, 0.4)"},
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
    helperText: {
        fontSize: 12,
        color: '#4A5568',
        marginBottom: 10,
    },
    mediaCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 10,
        marginBottom: 10,
    },
    mediaCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A202C',
        marginBottom: 8,
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
    photoPreviewContainer: {
        position: 'relative',
        marginTop: 15,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
    },
    photoPreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
    },
    removePhotoButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
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