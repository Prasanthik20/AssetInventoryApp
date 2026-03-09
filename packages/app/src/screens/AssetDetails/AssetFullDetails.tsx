import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground,Platform,ScrollView, TouchableOpacity, Switch, Image, Alert, TextInput, useWindowDimensions, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather,FontAwesome, MaterialCommunityIcons,Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, baseURL } from '../../navigation/types';
import useAssetMeta from "../../hooks/useAssetMeta";
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import assetStyles from './asset.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';


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

type AssigneeOption = {
    label: string;
    value: string;
    roleName: string;
};

const FieldPicker = ({
    value,
    placeholder,
    onPress,
}: {
    value?: string;
    placeholder: string;
    onPress: () => void;
}) => (
    <TouchableOpacity style={styles.inlinePicker} onPress={onPress}>
        <Text style={[styles.inlinePickerText, !value && styles.inlinePickerPlaceholder]}>
            {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#555" />
    </TouchableOpacity>
);
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
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
    
    const styles = assetStyles(isMobileLayout);
    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Editable fields state
    const [assetName, setAssetName] = useState(asset?.assetName || '');
    const [modelNumber, setModelNumber] = useState(asset?.modelNumber || '');
    const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || '');
    const [price, setPrice] = useState(asset?.price || '');
    const [location, setLocation] = useState(asset?.location || '');
    const [statusValue, setStatusValue] = useState(asset?.status || '');
    const [assignedTo, setAssignedTo] = useState(asset?.assignedTo || '');
    const [photoURL, setPhotoURL] = useState(asset?.photoURL || '');
    const [initialPhotoURL] = useState(asset?.photoURL || '');
    const [barcodeURL, setBarcodeURL] = useState(asset?.barcodeURL || '');
    const [initialBarcodeURL] = useState(asset?.barcodeURL || '');
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [showAssigneePicker, setShowAssigneePicker] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<AssigneeOption[]>([]);
    const [isPrivilegedEditor, setIsPrivilegedEditor] = useState(false);

    const locationOptions = ['Office', 'Field'];
    
    const matchedCategory = categories.find(c => String(c.id) === String(asset.category));
    const matchedStatus = statuses.find(s => String(s.id) === String(asset.status));

    useEffect(() => {
        const loadAssigneeOptions = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                const parsedUser = storedUser ? JSON.parse(storedUser) : null;
                const editorRole = String(
                    parsedUser?.roleName || parsedUser?.role?.roleName || '',
                ).toLowerCase();
                const privilegedRoles = [
                    'admin',
                    'superadmin',
                    'super admin',
                ];
                const canEditAllEmployees = privilegedRoles.includes(editorRole);
                setIsPrivilegedEditor(canEditAllEmployees);

                const response = await axios.get(`${baseURL}/api/auth/users`);
                const rawUsers =
                    response.data?.users || response.data?.data || response.data || [];

                const filteredUsers = rawUsers.filter((u: any) => {
                    const roleName = String(
                        u?.role?.roleName || u?.roleName || '',
                    ).toLowerCase();

                    if (canEditAllEmployees) return true;
                    return roleName === 'operator';
                });

                const mappedUsers = filteredUsers.map((u: any) => {
                    const displayName =
                        u?.fullName || u?.name || `Employee ${u?.employeeId || ''}`;
                    const roleName = String(
                        u?.role?.roleName || u?.roleName || 'Employee',
                    );

                    return {
                        label: `${displayName} (${roleName})`,
                        value: displayName,
                        roleName,
                    };
                });

                setAssignableUsers(mappedUsers);
            } catch (error) {
                console.error('Failed to load assignee options:', error);
                setAssignableUsers([]);
            }
        };

        loadAssigneeOptions();
    }, []);
    
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
            if (statusValue !== asset.status) {
                updateData.status = statusValue;
            }
            if (assignedTo !== (asset.assignedTo || '')) {
                updateData.assignedTo = assignedTo;
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
                asset.status = statusValue;
                asset.assignedTo = assignedTo;
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
            setStatusValue(asset?.status || '');
            setAssignedTo(asset?.assignedTo || '');
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
                    {!isMobileLayout && (
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
                    <View style={[styles.rightPanel, isMobileLayout && styles.mobileRightPanel]}>
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
                            {!isMobileLayout && (
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
                                isMobileLayout && { flexDirection: 'column', gap: 0 } 
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
                                    <DisplayField
                                        label="Status"
                                        value={statusValue || 'N/A'}
                                        icon="check-circle"
                                    >
                                        {isEditMode ? (
                                            <FieldPicker
                                                value={statusValue}
                                                placeholder="Select Status"
                                                onPress={() => setShowStatusPicker(true)}
                                            />
                                        ) : (
                                            <Text style={styles.valueText}>{statusValue || 'N/A'}</Text>
                                        )}
                                    </DisplayField>
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
                                    />
                                    <DisplayField 
                                        label="Price" 
                                        value={price} 
                                        icon="dollar" 
                                    />
                                </View>

                                <View style={styles.formColumn}>
                                    {/* Mobile Image Upload */}
                                    {isMobileLayout && (
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
                                        label="Location"
                                        value={location}
                                        icon="map-pin"
                                    >
                                        {isEditMode ? (
                                            <FieldPicker
                                                value={location}
                                                placeholder="Select Base Station"
                                                onPress={() => setShowLocationPicker(true)}
                                            />
                                        ) : (
                                            <Text style={styles.valueText}>{location || 'N/A'}</Text>
                                        )}
                                    </DisplayField>
                                    <DisplayField label="Assigned To" value={assignedTo || "N/A"} icon="user-check">
                                        {isEditMode ? (
                                            <FieldPicker
                                                value={assignedTo}
                                                placeholder={
                                                    isPrivilegedEditor
                                                        ? 'Select Employee'
                                                        : 'Select Operator'
                                                }
                                                onPress={() => setShowAssigneePicker(true)}
                                            />
                                        ) : (
                                            <Text style={styles.valueText}>{assignedTo || 'N/A'}</Text>
                                        )}
                                    </DisplayField>
                                    <DisplayField label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} icon="calendar" />
                                    <DisplayField label="Purchase Date" value={formatDate(asset.purchaseDate)} icon="calendar" />
                                </View>
                            </View>
                        </ScrollView>
                        
                        {/* Action Buttons */}
                        <View style={[styles.footer, isMobileLayout && { justifyContent: 'space-between' }]}>
                            <TouchableOpacity 
                                style={isMobileLayout && { flex: 1 }}
                                onPress={isEditMode ? handleSaveAsset : handleEditToggle}
                            >
                                <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.saveButton}>
                                    <Text style={styles.buttonText}>
                                        {isEditMode ? 'SAVE CHANGES' : 'EDIT ASSET'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.cancelButton, isMobileLayout && { flex: 1 }]} 
                                onPress={isEditMode ? handleEditToggle : () => navigation.goBack()}
                            >
                                <Text style={[styles.buttonText, { color: '#555' }]}>
                                    {isEditMode ? 'Cancel' : 'Go Back'}
                                </Text>
                        </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Status Picker Modal */}
                <Modal
                    visible={showStatusPicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowStatusPicker(false)}
                >
                    <View style={styles.pickerModalBackdrop}>
                        <View style={styles.pickerModalCard}>
                            <Text style={styles.pickerModalTitle}>Select Status</Text>
                            <ScrollView style={styles.pickerList}>
                                {statuses.map((s: any, index: number) => {
                                    const value = String(s?.status || '');
                                    return (
                                        <TouchableOpacity
                                            key={`${value}-${index}`}
                                            style={styles.pickerModalItem}
                                            onPress={() => {
                                                setStatusValue(value);
                                                setShowStatusPicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerModalItemText}>{value}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.pickerModalCloseBtn}
                                onPress={() => setShowStatusPicker(false)}
                            >
                                <Text style={styles.pickerModalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Location Picker Modal */}
                <Modal
                    visible={showLocationPicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowLocationPicker(false)}
                >
                    <View style={styles.pickerModalBackdrop}>
                        <View style={styles.pickerModalCard}>
                            <Text style={styles.pickerModalTitle}>Select Location</Text>
                            <ScrollView style={styles.pickerList}>
                                {locationOptions.map((item, index) => (
                                    <TouchableOpacity
                                        key={`${item}-${index}`}
                                        style={styles.pickerModalItem}
                                        onPress={() => {
                                            setLocation(item);
                                            setShowLocationPicker(false);
                                        }}
                                    >
                                        <Text style={styles.pickerModalItemText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.pickerModalCloseBtn}
                                onPress={() => setShowLocationPicker(false)}
                            >
                                <Text style={styles.pickerModalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Assignee Picker Modal */}
                <Modal
                    visible={showAssigneePicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowAssigneePicker(false)}
                >
                    <View style={styles.pickerModalBackdrop}>
                        <View style={styles.pickerModalCard}>
                            <Text style={styles.pickerModalTitle}>
                                {isPrivilegedEditor ? 'Select Employee' : 'Select Operator'}
                            </Text>
                            <ScrollView style={styles.pickerList}>
                                {assignableUsers.map((u, index) => (
                                    <TouchableOpacity
                                        key={`${u.value}-${index}`}
                                        style={styles.pickerModalItem}
                                        onPress={() => {
                                            setAssignedTo(u.value);
                                            setShowAssigneePicker(false);
                                        }}
                                    >
                                        <Text style={styles.pickerModalItemText}>{u.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.pickerModalCloseBtn}
                                onPress={() => setShowAssigneePicker(false)}
                            >
                                <Text style={styles.pickerModalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </ImageBackground>
    );
};


// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
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
    inlinePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inlinePickerText: {
        fontSize: 14,
        color: '#1A202C',
        fontWeight: '500',
    },
    inlinePickerPlaceholder: {
        color: '#6b7280',
    },
    pickerModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    pickerModalCard: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    pickerModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        color: '#111827',
    },
    pickerList: {
        maxHeight: 320,
    },
    pickerModalItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    pickerModalItemText: {
        fontSize: 14,
        color: '#1f2937',
    },
    pickerModalCloseBtn: {
        marginTop: 12,
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#e2e8f0',
    },
    pickerModalCloseText: {
        color: '#334155',
        fontWeight: '600',
    },
});

export default AssetFullDetails;