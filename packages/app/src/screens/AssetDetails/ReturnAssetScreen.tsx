import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform,ImageBackground, ScrollView, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Asset, baseURL, RootStackParamList } from '../../navigation/types';
import { globalColors } from '../..//styles/globalStyles';
import AppSnackbar from 'src/components/common/AppSnackbar';

type ReturnAssetRouteProp = RouteProp<RootStackParamList, 'ReturnAsset'>;

const ReturnAssetScreen: React.FC = () => {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
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
    const [snackbar, setSnackbar] = useState<{
        visible: boolean;
        message: string;
        kind: 'success' | 'error' | 'info';
    }>({ visible: false, message: '', kind: 'info' });

    const toAssetId = (value: unknown) => Number(value);
    const toAssetKey = (value: unknown) => String(toAssetId(value));
    const toAssignmentId = (value: unknown) => Number(value);

    const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
        setSnackbar({ visible: true, message, kind });
        setTimeout(() => {
            setSnackbar((prev) => ({ ...prev, visible: false }));
        }, 3200);
    };

    // --- Modal Handler Functions ---
    const handleOpenModal = (assetName: string) => {
        setSelectedOverdueAsset(assetName);
        setModalVisible(true);
    };
    const handleCloseModal = () => setModalVisible(false);
    const handleSubmitNotification = (reason: string) => {
        console.log(`Reason for overdue asset "${selectedOverdueAsset}": ${reason}`);
        showSnackbar("Your supervisor has been notified.", 'success');
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
                showSnackbar('Camera permission is required to scan QR/barcode.', 'error');
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
                        showSnackbar('Captured barcode saved for selected asset.', 'success');
                    } else {
                        setBarcodeURL(barcodeData);
                        showSnackbar('Captured barcode image will be attached to the return.', 'success');
                    }
                } else {
                    showSnackbar('Failed to process captured image. Please try again.', 'error');
                }
            }
        } catch (error) {
            console.error('Barcode camera error:', error);
            showSnackbar('Failed to open camera.', 'error');
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
                showSnackbar('Camera roll permission is required to upload photos.', 'error');
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
                        showSnackbar('Photo saved for selected asset.', 'success');
                    } else {
                        setPhoto(photoURL);
                        showSnackbar('Photo will be attached to the return.', 'success');
                    }
                } else {
                    showSnackbar('Failed to process image. Please try again.', 'error');
                }
            }
        } catch (error) {
            console.error('Photo picker error:', error);
            showSnackbar('Failed to open image library.', 'error');
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
                showSnackbar('Camera roll permission is required to upload barcode image.', 'error');
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
                        showSnackbar('Barcode saved for selected asset.', 'success');
                    } else {
                        setBarcodeURL(barcodeData);
                        showSnackbar('Barcode image will be attached to the return.', 'success');
                    }
                } else {
                    showSnackbar('Failed to process barcode image. Please try again.', 'error');
                }
            }
        } catch (error) {
            console.error('Barcode picker error:', error);
            showSnackbar('Failed to open image library.', 'error');
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
            showSnackbar("Invalid operator employee ID.", 'error');
            return;
        }

        if (selectedAssets.length === 0) {
            showSnackbar("Please select at least one asset to return.", 'error');
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
                showSnackbar('Please upload both photo and barcode for each selected asset.', 'error');
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
                showSnackbar("Assets returned successfully", 'success');
                setTimeout(
                    () => navigation.navigate("OperatorDashboard", { refresh: Date.now() }),
                    500,
                );
                navigation.goBack();
            }
        } catch (error: any) {
            console.error("Return asset error:", error?.response?.data || error.message);
            showSnackbar(error?.response?.data?.message || "Failed to return assets.", 'error');
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
                    color={isSelected ? '#34D399' : '#A9C6E4'}
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
                                color="#F97373"
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
                <View style={[styles.container, isMobileLayout && { margin: 10, borderRadius: 15 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#E6F3FF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Select Assets to Return</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Content Body */}
                    <ScrollView 
                        style={styles.body} 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={isMobileLayout ? { paddingBottom: 20 } : { flex: 1 }}
                    >
                        <View style={[styles.formBody, isMobileLayout && { flexDirection: 'column', gap: 15 }]}>
                            {/* Left Column - Asset List */}
                            <View style={styles.formColumn}>
                                <Text style={styles.instructions}>
                                    Select one or more assets you wish to return.
                                </Text>
                                {isMobileLayout ? (
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
                                                                <ActivityIndicator color="#A9C6E4" size="small" />
                                                            ) : (
                                                                <>
                                                                    <Feather name="camera" size={20} color="#A9C6E4" />
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
                                                                <ActivityIndicator color="#A9C6E4" size="small" />
                                                            ) : (
                                                                <>
                                                                    <MaterialCommunityIcons name="barcode-scan" size={20} color="#A9C6E4" />
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
                                                <ActivityIndicator color="#A9C6E4" size="small" />
                                            ) : (
                                                <>
                                                    <Feather name="camera" size={20} color="#A9C6E4" />
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
                                                        showSnackbar('Photo has been removed.', 'info');
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
                                                <ActivityIndicator color="#A9C6E4" size="small" />
                                            ) : (
                                                <>
                                                    <MaterialCommunityIcons name="barcode" size={20} color="#A9C6E4" />
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
                                                        showSnackbar('Barcode image has been removed.', 'info');
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
                    <View style={[styles.footer, isMobileLayout && { justifyContent: 'space-between' }]}>
                        <TouchableOpacity 
                            style={[styles.cancelButton, isMobileLayout && { flex: 1, marginRight: 10 }]} 
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={[styles.buttonText, { color: '#A9C6E4' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={isMobileLayout && { flex: 2 }} 
                            onPress={handleReturn}>
                            <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.returnButton}>
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

// --- STYLES REVISED FOR NEW LAYOUT AND CLEAN AESTHETIC ---
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    safeArea: { flex: 1, backgroundColor: '#071425' },
    container: {
        flex: 1,
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(7, 24, 42, 0.82)',
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(7, 24, 42, 0.9)',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(159, 207, 255, 0.22)'
    },
    backButton: { position: 'absolute', left: 20, marginTop : 20 },
    headerTitle: { color: '#E6F3FF', fontSize: 20, fontWeight: 'bold', marginTop : 20 },
    body: { flex: 1, 
        paddingHorizontal: Platform.OS !== 'web' ? 15 : 25,
        paddingTop: 15},
    formBody: { flexDirection: 'row', gap: 25, flex: 1 },
    formColumn: { flex: 1 },
    instructions: {
        fontSize: 15,
        color: '#A9C6E4',
        marginBottom: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    helperText: {
        fontSize: 12,
        color: '#A9C6E4',
        marginBottom: 10,
    },
    mediaCard: {
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
        padding: 10,
        marginBottom: 10,
    },
    mediaCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E6F3FF',
        marginBottom: 8,
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 12,
        padding: 12, // Reduced padding for mobile
        marginBottom: 10,
        elevation: 2, // Added shadow for better separation
        shadowColor: '#001325',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    assetRowSelected: {
        borderColor: '#34D399',
        backgroundColor: 'rgba(52, 211, 153, 0.18)',
    },
    checkboxIcon: { marginRight: 15 },
    assetInfo: { flex: 1 },
    assetName: { fontSize: 15, 
        fontWeight: '600', 
        color: '#E6F3FF',
        flexShrink: 1 },// Prevents pushing content off screen },
    statusActionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    assetStatus: { fontSize: 14, color: '#A9C6E4', fontWeight: '500' },
    assetStatusOverdue: { color: '#F97373', fontWeight: 'bold' },
    notifyButton: {
        marginLeft: 10,
        padding: 5,
    },
    label: {
        fontSize: 14,
        color: '#A9C6E4',
        marginBottom: 8,
        fontWeight: '600',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F766E',
        borderRadius: 10,
        paddingVertical: 14,
        marginBottom: 20,
    },
    scanButtonText: { color: globalColors.surfacePrimary, fontSize: 16, fontWeight: '600', marginLeft: 10 },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 10,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    uploadButtonText: { color: '#A9C6E4', fontSize: 15, fontWeight: '500', marginLeft: 10 },
    photoPreviewContainer: {
        position: 'relative',
        marginTop: 15,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'rgba(7, 24, 42, 0.92)',
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
        backgroundColor: 'rgba(7, 24, 42, 0.9)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(159, 207, 255, 0.22)',
    },
    returnButton: { paddingVertical: 14, // Taller for mobile touch
        paddingHorizontal: 20, 
        borderRadius: 10, 
        alignItems: 'center' },
    cancelButton: { paddingVertical: 14, 
        paddingHorizontal: 20, 
        borderRadius: 10, 
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        alignItems: 'center'},
    buttonText: { color: globalColors.surfacePrimary, fontSize: 14, fontWeight: 'bold' },
});

export default ReturnAssetScreen;