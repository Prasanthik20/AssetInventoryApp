import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground,Platform,ScrollView, TouchableOpacity, Switch, Image, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather,FontAwesome, MaterialCommunityIcons,Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, baseURL } from '../../navigation/types';
import useAssetMeta from "../../hooks/useAssetMeta";
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';


type AssetFullDetailsRouteProp = RouteProp<
    RootStackParamList,
    'AssetFullDetails'
>;
const iconMap: any = {
    truck: <Feather name="truck" size={16} color="#222" />,
    layers: <Feather name="layers" size={16} color="#222" />,
    "check-circle": <Feather name="check-circle" size={16} color="#222" />,
    archive: <MaterialCommunityIcons name="archive" size={16} color="#222" />,
    hash: <MaterialCommunityIcons name="pound" size={16} color="#222" />,
    dollar: <FontAwesome name="dollar" size={16} color="#222" />,
    "map-pin": <Feather name="map-pin" size={16} color="#222" />,
    "user-check": <Feather name="user-check" size={16} color="#222" />,
    calendar: <Feather name="calendar" size={16} color="#222" />,
};
const DisplayField = ({ label, value, icon, children, editable, onChangeText }: { 
    label: string, 
    value?: string, 
    icon?: any, 
    children?: React.ReactNode,
    editable?: boolean,
    onChangeText?: (text: string) => void 
}) => (
     <View style={styles.fieldContainer}>
        <View style={styles.labelContainer}>
            {icon && iconMap[icon]}
            <Text style={styles.label}>{label}</Text>
        </View>

        <View style={[styles.valueBox, editable && styles.editableBox]}>
            {editable ? (
                <TextInput
                    style={styles.editableText}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={label}
                    placeholderTextColor="#999"
                />
            ) : (
                children || <Text style={styles.valueText}>{value}</Text>
            )}
        </View>
    </View>
);
const formatDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return "N/A";

  const date = dateValue instanceof Date
    ? dateValue
    : new Date(dateValue);

  return isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString();
};

const inferMimeType = (uri: string, explicitMimeType?: string): string => {
    if (explicitMimeType) return explicitMimeType;

    const cleanUri = uri.split('?')[0].toLowerCase();
    if (cleanUri.endsWith('.png')) return 'image/png';
    if (cleanUri.endsWith('.webp')) return 'image/webp';
    if (cleanUri.endsWith('.heic')) return 'image/heic';
    if (cleanUri.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
};

const toPersistentDataUrl = async (uri: string, mimeType?: string): Promise<string> => {
    if (!uri) return '';
    if (uri.startsWith('data:')) return uri;

    const resolvedMimeType = inferMimeType(uri, mimeType);

    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.type) {
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
                reader.readAsDataURL(blob);
            });
        }
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
            reader.readAsDataURL(blob);
        });
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
    });
    return `data:${resolvedMimeType};base64,${base64}`;
};

const AssetFullDetails: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<AssetFullDetailsRouteProp>();
    const { categories, statuses } = useAssetMeta();
    const { asset } = route.params;
    
    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Editable fields state
    const [assetName, setAssetName] = useState(asset?.assetName || '');
    const [modelNumber, setModelNumber] = useState(asset?.modelNumber || '');
    const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || '');
    const [price, setPrice] = useState(asset?.price || '');
    const [location, setLocation] = useState(asset?.location || '');
    const [photoURL, setPhotoURL] = useState(asset?.photoURL || '');
    const [initialPhotoURL] = useState(asset?.photoURL || '');
    const [barcodeURL, setBarcodeURL] = useState(asset?.barcodeURL || '');
    const [initialBarcodeURL] = useState(asset?.barcodeURL || '');
    
    const matchedCategory = categories.find(c => String(c.id) === String(asset.category));
    const matchedStatus = statuses.find(s => String(s.id) === String(asset.status));
    const isMobileDevice = Platform.OS !== 'web';
    
    const handleImageUpload = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Please allow access to your photo library.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                try {
                    // Convert to persistent data URL so it still works after reload.
                    const dataURL = await toPersistentDataUrl(
                        result.assets[0].uri,
                        result.assets[0].mimeType || undefined
                    );
                    setPhotoURL(dataURL);
                } catch (readError) {
                    // Fallback to URI if file system read fails
                    console.warn("Could not read file, using URI:", readError);
                    setPhotoURL(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to select image");
        }
    };
    
    const handleBarcodeUpload = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Please allow access to your photo library.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                try {
                    // Convert to persistent data URL so it still works after reload.
                    const dataURL = await toPersistentDataUrl(
                        result.assets[0].uri,
                        result.assets[0].mimeType || undefined
                    );
                    setBarcodeURL(dataURL);
                } catch (readError) {
                    // Fallback to URI if file system read fails
                    console.warn("Could not read barcode file, using URI:", readError);
                    setBarcodeURL(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error("Error picking barcode image:", error);
            Alert.alert("Error", "Failed to select barcode image");
        }
    };
    
    const handleSaveAsset = async () => {
        try {
            if (!asset.id) {
                Alert.alert("Error", "Asset ID is missing");
                return;
            }

            const updateData: any = {};
            
            // Check each field for changes
            if (assetName !== asset.assetName) {
                updateData.assetName = assetName;
            }
            if (modelNumber !== asset.modelNumber) {
                updateData.modelNumber = modelNumber;
            }
            if (serialNumber !== asset.serialNumber) {
                updateData.serialNumber = serialNumber;
            }
            if (price !== asset.price) {
                updateData.price = price;
            }
            if (location !== asset.location) {
                updateData.location = location;
            }
            
            // Include photoURL if it changed and is not empty
            if (photoURL && photoURL !== initialPhotoURL) {
                updateData.photoURL = photoURL;
            }
            
            // Include barcodeURL if it changed and is not empty
            if (barcodeURL && barcodeURL !== initialBarcodeURL) {
                updateData.barcodeURL = barcodeURL;
            }

            // Only send update if there are changes
            if (Object.keys(updateData).length === 0) {
                Alert.alert("No Changes", "No updates to save");
                setIsEditMode(false);
                return;
            }

            const response = await axios.put(
                `${baseURL}/api/assets/assetId?assetId=${asset.id}`,
                updateData
            );

            if (response.status === 200) {
                Alert.alert("Success", "Asset updated successfully");
                setIsEditMode(false);
                // Update the asset object with new values
                asset.assetName = assetName;
                asset.modelNumber = modelNumber;
                asset.serialNumber = serialNumber;
                asset.price = price;
                asset.location = location;
                if (photoURL) {
                    asset.photoURL = photoURL;
                }
                if (barcodeURL) {
                    asset.barcodeURL = barcodeURL;
                }
            }
        } catch (error: any) {
            console.error("Save Asset Error:", error);
            const errorMsg = error.response?.data?.message || "Failed to update asset";
            Alert.alert("Error", errorMsg);
        }
    };
    
    const handleEditToggle = () => {
        if (isEditMode) {
            // Cancel edit mode - reset fields
            setAssetName(asset?.assetName || '');
            setModelNumber(asset?.modelNumber || '');
            setSerialNumber(asset?.serialNumber || '');
            setPrice(asset?.price || '');
            setLocation(asset?.location || '');
            setPhotoURL(asset?.photoURL || '');
            setBarcodeURL(asset?.barcodeURL || '');
        }
        setIsEditMode(!isEditMode);
    };
    
    if (!asset) {
        return <Text>Asset not found!</Text>;
    }

    return (
        <ImageBackground
            source={require("../../assets/Company-bg.webp")}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={5}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Left Decorative Panel */}
                    {!isMobileDevice && (
                    <LinearGradient
                        colors={['rgba(93, 113, 200, 0.7)', 'rgba(59, 89, 184, 0.8)']}
                        style={styles.leftPanel}
                    >
                         <TouchableOpacity 
                            onPress={handleImageUpload}
                            style={styles.imageUploadContainer}
                            disabled={!isEditMode}
                        >
                            {photoURL ? (
                                <View style={styles.imageWrapper}>
                                    <Image
                                        source={{ uri: photoURL }}
                                        style={styles.leftPanelImage}
                                    />
                                    {isEditMode && (
                                        <View style={styles.editOverlay}>
                                            <Feather name="edit-2" size={24} color="#fff" />
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <Feather name="upload" size={48} color="#fff" />
                                    <Text style={styles.uploadText}>Upload Image</Text>
                                </View>
                            )}
                        </TouchableOpacity> 
                        <Text style={styles.leftPanelTitle}>ASSET DETAILS</Text>
                        <Text style={styles.leftPanelSubtitle}>COMPREHENSIVE EQUIPMENT RECORD</Text>
                        <Text style={styles.brandName}>ASSETFLOW PRO</Text>
                    </LinearGradient>
                    )}
                    {/* Right Details Panel */}
                    <View style={styles.rightPanel}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#000000ff" />
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Text style={styles.headerTitle}>Asset Information</Text>
                                {isEditMode && (
                                    <View style={styles.editBadge}>
                                        <Text style={styles.editBadgeText}>Editing</Text>
                                    </View>
                                )}
                            </View>
                            {!isMobileDevice && (
                            <View style={styles.headerRight}>
                                <Feather name="user" size={16} color="#333" />
                                {/* <Text style={styles.userText}>Supervisor</Text> */}
                                {/* <Switch
                                    trackColor={{ false: "#E9E9EA", true: "#34C759" }}
                                    thumbColor={"#f4f3f4"} value={true}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                /> */}
                                <Feather name="settings" size={20} color="#333" style={{ marginLeft: 5 }} />
                            </View>
                            )}  
                        </View>

                        {/* Details Body */}
                       <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={[
                                styles.formBody, 
                                isMobileDevice && { flexDirection: 'column', gap: 0 } 
                            ]}>
                                
                                <View style={styles.formColumn}>
                                    <Text style={styles.sectionTitle}>General Details</Text>
                                    <DisplayField 
                                        label="Asset Name" 
                                        value={assetName} 
                                        icon="truck" 
                                        editable={isEditMode}
                                        onChangeText={setAssetName}
                                    />
                                    <DisplayField label="Category" value={asset.category} icon="layers"/>
                                    <DisplayField label="Status" value={asset.status} icon="check-circle" />
                                    <DisplayField 
                                        label="Model Number" 
                                        value={modelNumber} 
                                        icon="archive" 
                                        editable={isEditMode}
                                        onChangeText={setModelNumber}
                                    />
                                    <DisplayField 
                                        label="Serial Number" 
                                        value={serialNumber} 
                                        icon="hash" 
                                        editable={isEditMode}
                                        onChangeText={setSerialNumber}
                                    />
                                    <DisplayField 
                                        label="Price" 
                                        value={price} 
                                        icon="dollar" 
                                        editable={isEditMode}
                                        onChangeText={setPrice}
                                    />
                                </View>

                                <View style={styles.formColumn}>
                                    {/* Mobile Image Upload */}
                                    {isMobileDevice && (
                                        <TouchableOpacity 
                                            onPress={handleImageUpload}
                                            style={styles.mobileImageContainer}
                                            disabled={!isEditMode}
                                        >
                                            {photoURL ? (
                                                <Image
                                                    source={{ uri: photoURL }}
                                                    style={styles.mobileImage}
                                                />
                                            ) : (
                                                <View style={styles.mobileUploadPlaceholder}>
                                                    <Feather name="camera" size={32} color="#666" />
                                                    <Text style={styles.mobileUploadText}>Add Photo</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                     <Text style={styles.barcodeText}>Asset ID: {asset.barcode || 'N/A'}</Text>
                                    {/* Barcode Image with Upload */}
                                    <TouchableOpacity 
                                        onPress={handleBarcodeUpload}
                                        style={styles.barcodeContainer}
                                        disabled={!isEditMode}
                                    >
                                        {barcodeURL ? (
                                     <Image source={{ uri: barcodeURL }} style={styles.barcodeImage} />
                                        ) : (
                                            <View style={styles.barcodeUploadPlaceholder}>
                                                <Feather name="maximize" size={24} color="#666" />
                                                <Text style={styles.barcodeUploadText}>Upload Barcode</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                   
                                    <DisplayField 
                                        label="Current Location" 
                                        value={location} 
                                        icon="map-pin" 
                                        editable={isEditMode}
                                        onChangeText={setLocation}
                                    />
                                    <DisplayField label="Assigned To" value={asset.assignedTo || "N/A"} icon="user-check" />
                                    <DisplayField label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} icon="calendar" />
                                    <DisplayField label="Purchase Date" value={formatDate(asset.purchaseDate)} icon="calendar" />
                                </View>
                            </View>
                        </ScrollView>
                        
                        {/* Action Buttons */}
                        <View style={[styles.footer, isMobileDevice && { justifyContent: 'space-between' }]}>
                            <TouchableOpacity 
                                style={isMobileDevice && { flex: 1 }}
                                onPress={isEditMode ? handleSaveAsset : handleEditToggle}
                            >
                                <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.saveButton}>
                                    <Text style={styles.buttonText}>
                                        {isEditMode ? 'SAVE CHANGES' : 'EDIT ASSET'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.cancelButton, isMobileDevice && { flex: 1 }]} 
                                onPress={isEditMode ? handleEditToggle : () => navigation.goBack()}
                            >
                                <Text style={[styles.buttonText, { color: '#555' }]}>
                                    {isEditMode ? 'Cancel' : 'Go Back'}
                                </Text>
                        </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
    safeArea: { flex: 1,backgroundColor: "rgba(61, 138, 233, 0.4)" },
    container: { // Renamed from 'modalCard'
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        width: '35%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    imageUploadContainer: {
        marginBottom: 20,
    },
    imageWrapper: {
        position: 'relative',
    },
    editOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadPlaceholder: {
        width: 180,
        height: 180,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 14,
        fontWeight: '600',
    },
    leftPanelImage: { width: 180, height: 180, resizeMode: 'contain', borderRadius: 10 },
    mobileImageContainer: {
        width: '100%',
        marginBottom: 20,
        alignItems: 'center',
    },
    mobileImage: {
        width: 150,
        height: 150,
        resizeMode: 'cover',
        borderRadius: 10,
        backgroundColor: '#f5f5f5',
    },
    mobileUploadPlaceholder: {
        width: 150,
        height: 150,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mobileUploadText: {
        color: '#666',
        marginTop: 8,
        fontSize: 13,
        fontWeight: '500',
    },
    leftPanelTitle: { fontSize: 30, fontWeight: 'bold', color: '#000000ff', textAlign: 'center' },
    leftPanelSubtitle: { fontSize: 13, color: '#000000ff', marginTop: 10, opacity: 0.8, letterSpacing: 1 },
    brandName: { fontSize: 15, color: '#000000ff', marginTop: 30, opacity: 0.8 },
    rightPanel: {
        flex: 1,
        // If mobile, make background solid white for better readability
        backgroundColor: Platform.OS !== 'web' ? '#fff' : 'rgba(255, 255, 255, 0.4)', 
        padding: 20,
        borderTopLeftRadius: Platform.OS !== 'web' ? 25 : 0, // Rounded corners for mobile
        borderTopRightRadius: Platform.OS !== 'web' ? 25 : 0,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000ff' }, // White text
    editBadge: {
        backgroundColor: '#27B2C3',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    editBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor: 'rgba(20, 2, 2, 0.7)', // Semi-transparent
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    // Added backButton style to avoid missing property error
    backButton: { padding: 6, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
    userText: { marginLeft: 8, marginRight: 8, fontSize: 14, fontWeight: '500' },
    formBody: { flexDirection: 'row', gap: 25, flex: 1 },
    formColumn: { flex: 1, width: '100%' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#000000ff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 5},
    fieldContainer: { marginBottom: 12 },
    labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 5 },
    label: { fontSize: 12, color: '#000000ff', fontWeight: '500' }, // Light text
    fieldIcon: { marginRight: 6 },
    valueBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(14, 1, 1, 0.8)',
    },
    editableBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#27B2C3',
        borderWidth: 2,
    },
    valueText: {
        fontSize: 14,
        color: '#1A202C', // Dark text inside light boxes for contrast
        fontWeight: '500',
    },
    editableText: {
        fontSize: 14,
        color: '#1A202C',
        fontWeight: '500',
        padding: 0,
        margin: 0,
    },
    barcodeContainer: {
        marginBottom: 5,
    },
    barcodeImage: {
        width: '100%',
        height: 70,
        resizeMode: 'contain',
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Almost solid white
        padding: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#0f0101ff',
    },
    barcodeUploadPlaceholder: {
        width: '100%',
        height: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    barcodeUploadText: {
        color: '#666',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
    },
    barcodeText: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#000000ff' },
    currentUserText: { textAlign: 'center', fontSize: 13, color: '#000000ff', marginTop: 5, marginBottom: 20 },
    purchaseDetails: { flexDirection: 'row' },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
    },
    saveButton: { paddingVertical: 12, 
        paddingHorizontal: 20, 
        borderRadius: 10,
        alignItems: 'center' },
    cancelButton: { paddingVertical: 12, 
        paddingHorizontal: 20, 
        borderRadius: 10, 
        backgroundColor: '#EAEAEA', 
        marginLeft: 10,
        alignItems: 'center'
     },
    buttonText: { color: '#000000ff', fontSize: 14, fontWeight: 'bold' },
});

export default AssetFullDetails;