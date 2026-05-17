import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground,Platform,ScrollView, TouchableOpacity, Switch, Image, TextInput, useWindowDimensions, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather,FontAwesome, MaterialCommunityIcons,Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, baseURL } from '../../navigation/types';
import useAssetMeta from "../../hooks/useAssetMeta";
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import assetStyles from './asset.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalColors } from '../../styles/globalStyles';
import AppSnackbar from 'src/components/common/AppSnackbar';


type AssetFullDetailsRouteProp = RouteProp<
    RootStackParamList,
    'AssetFullDetails'
>;
const iconMap: any = {
    truck: <Feather name="truck" size={16} color="#22D3EE" />,
    layers: <Feather name="layers" size={16} color="#22D3EE" />,
    "check-circle": <Feather name="check-circle" size={16} color="#22D3EE" />,
    archive: <MaterialCommunityIcons name="archive" size={16} color="#22D3EE" />,
    hash: <MaterialCommunityIcons name="pound" size={16} color="#22D3EE" />,
    dollar: <FontAwesome name="dollar" size={16} color="#22D3EE" />,
    "map-pin": <Feather name="map-pin" size={16} color="#22D3EE" />,
    "user-check": <Feather name="user-check" size={16} color="#22D3EE" />,
    calendar: <Feather name="calendar" size={16} color="#22D3EE" />,
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
        <Ionicons name="chevron-down" size={16} color="#A9C6E4" />
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
                    placeholderTextColor="#7FA2C8"
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
    const { statuses, categories } = useAssetMeta();
    const { asset } = route.params;
    const startInEditMode = route.params?.startInEditMode;
    const isAssignedCardEdit = Boolean(startInEditMode);
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
    
    const styles = assetStyles(isMobileLayout);
    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Editable fields state
    const [assetName, setAssetName] = useState(asset?.assetName || '');
    const [selectedCategory, setSelectedCategory] = useState(String(asset?.category || ''));
    const [controllerKey, setControllerKey] = useState(String(asset?.controllerKey || ''));
    const [modelNumber, setModelNumber] = useState(asset?.modelNumber || '');
    const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || '');
    const [price, setPrice] = useState(asset?.price || '');
    const [warrantyExpiry, setWarrantyExpiry] = useState(asset?.warrantyExpiry || '');
    const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate || '');
    const [location, setLocation] = useState(asset?.location || '');
    const [projectName, setProjectName] = useState(asset?.projectName || '');
    const [assignedDate, setAssignedDate] = useState(asset?.assignedDate || '');
    const [statusValue, setStatusValue] = useState(asset?.status || '');
    const [assignedTo, setAssignedTo] = useState(asset?.assignedTo || 'Admin Role');
    const [photoURL, setPhotoURL] = useState(asset?.photoURL || '');
    const [initialPhotoURL] = useState(asset?.photoURL || '');
    const [barcodeURL, setBarcodeURL] = useState(asset?.barcodeURL || '');
    const [initialBarcodeURL] = useState(asset?.barcodeURL || '');
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showAssigneePicker, setShowAssigneePicker] = useState(false);
    const [showAssignedDatePicker, setShowAssignedDatePicker] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<AssigneeOption[]>([]);
    const [snackbar, setSnackbar] = useState<{
        visible: boolean;
        message: string;
        kind: 'success' | 'error' | 'info';
    }>({ visible: false, message: '', kind: 'info' });
    const isControllerCategory = String(selectedCategory || '').trim().toLowerCase().includes('controller');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSnackbar({ visible: true, message, kind });
        timeoutRef.current = setTimeout(() => {
            setSnackbar((prev) => ({ ...prev, visible: false }));
        }, 3200);
    };

    useEffect(() => {
        const loadAssigneeOptions = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                const parsedUser = storedUser ? JSON.parse(storedUser) : null;
                const editorRole = String(
                    parsedUser?.roleName || parsedUser?.role?.roleName || '',
                ).toLowerCase();
                const canEditAllEmployees = editorRole === 'admin';

                const response = await axios.get(`${baseURL}/api/auth/users`);
                const rawUsers =
                    response.data?.users || response.data?.data || response.data || [];

                const filteredUsers = rawUsers.filter((u: any) => {
                    const roleName = String(
                        u?.role?.roleName || u?.roleName || '',
                    ).toLowerCase();

                    return roleName === 'admin';
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
                if (!asset?.assignedTo && mappedUsers.length > 0) {
                    setAssignedTo(mappedUsers[0].value);
                }
            } catch (error) {
                console.error('Failed to load assignee options:', error);
                setAssignableUsers([]);
            }
        };

        loadAssigneeOptions();
    }, []);

    useEffect(() => {
        if (startInEditMode) {
            setIsEditMode(true);
        }
    }, [startInEditMode]);

    useEffect(() => {
        if (!isAssignedCardEdit) return;

        const loadAssignmentDetails = async () => {
            try {
                const response = await axios.get(`${baseURL}/api/assets/assign`, {
                    params: {
                        assignmentId: asset?.assignmentId,
                        assetId: asset?.id,
                    },
                });

                const assignment = response.data;
                if (!assignment) return;

                setProjectName(assignment.projectName || asset?.projectName || '');
                setLocation(assignment.location || asset?.location || '');
                setAssignedDate(assignment.assignedDate || asset?.assignedDate || '');
            } catch (error) {
                console.error('Failed to load assignment details:', error);
            }
        };

        loadAssignmentDetails();
    }, [asset?.assignmentId, asset?.id, asset?.location, asset?.projectName, asset?.assignedDate, isAssignedCardEdit]);
    
    const handleImageUpload = async () => {
        if (Platform.OS === 'web') {
            await launchLibrary('photo');
            return;
        }

        Alert.alert(
            "Upload Photo",
            "Choose a source for your asset photo",
            [
                { text: "Camera", onPress: () => launchCamera('photo') },
                { text: "Gallery", onPress: () => launchLibrary('photo') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };
    
    const handleBarcodeUpload = async () => {
        if (Platform.OS === 'web') {
            await launchLibrary('barcode');
            return;
        }

        Alert.alert(
            "Upload Barcode",
            "Choose a source for your barcode image",
            [
                { text: "Camera", onPress: () => launchCamera('barcode') },
                { text: "Gallery", onPress: () => launchLibrary('barcode') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const launchCamera = async (type: 'photo' | 'barcode') => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                showSnackbar('Camera permission is required.', 'error');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'barcode' ? [4, 1] : [1, 1],
                quality: 0.5,
                base64: true,
            });

            processResult(result, type);
        } catch (error) {
            console.error('Camera error:', error);
            showSnackbar('Failed to open camera.', 'error');
        }
    };

    const launchLibrary = async (type: 'photo' | 'barcode') => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showSnackbar('Media library permission is required.', 'error');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'barcode' ? [4, 1] : [1, 1],
                quality: 0.5,
                base64: true,
            });

            processResult(result, type);
        } catch (error) {
            console.error('Library error:', error);
            showSnackbar('Failed to open gallery.', 'error');
        }
    };

    const processResult = async (result: ImagePicker.ImagePickerResult, type: 'photo' | 'barcode') => {
        if (!result.canceled && result.assets[0]) {
            try {
                const asset = result.assets[0];
                if (asset.base64) {
                    const dataURL = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
                    if (type === 'photo') setPhotoURL(dataURL);
                    else setBarcodeURL(dataURL);
                } else {
                    const dataURL = await toPersistentDataUrl(
                        asset.uri,
                        asset.mimeType || undefined
                    );
                    if (type === 'photo') setPhotoURL(dataURL);
                    else setBarcodeURL(dataURL);
                }
            } catch (readError) {
                console.warn("Could not read file, using URI:", readError);
                if (type === 'photo') setPhotoURL(result.assets[0].uri);
                else setBarcodeURL(result.assets[0].uri);
            }
        }
    };
    
    const handleSaveAsset = async () => {
        try {
            if (!asset.id) {
                showSnackbar("Asset ID is missing", 'error');
                return;
            }

            const updateData: any = {};

            if (isAssignedCardEdit) {
                if (projectName.trim() !== String(asset.projectName || '').trim()) {
                    updateData.project_name = projectName.trim();
                }

                if (location !== asset.location) {
                    updateData.destination = location;
                }

                if (assignedDate !== String(asset.assignedDate || '')) {
                    updateData.assigned_date = assignedDate;
                }

                if (Object.keys(updateData).length === 0) {
                    showSnackbar("No assignment update to save", 'info');
                    setIsEditMode(false);
                    return;
                }

                const response = await axios.put(
                    `${baseURL}/api/assets/assign`,
                    {
                        assignmentId: asset.assignmentId,
                        assetId: asset.id,
                        ...updateData,
                    }
                );

                if (response.status === 200) {
                    showSnackbar("Assigned asset updated successfully", 'success');
                    setIsEditMode(false);
                    asset.projectName = projectName.trim();
                    asset.location = location;
                    asset.assignedDate = assignedDate;
                }
                return;
            }
            
            // Check each field for changes
            if (assetName !== asset.assetName) {
                updateData.assetName = assetName;
            }
            if (selectedCategory !== String(asset.category || '')) {
                updateData.category = selectedCategory;
            }
            if (
                selectedCategory !== String(asset.category || '') ||
                String(controllerKey || '').trim() !== String(asset.controllerKey || '').trim()
            ) {
                updateData.controllerKey = isControllerCategory
                    ? (String(controllerKey || '').trim() || null)
                    : null;
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
            if (purchaseDate !== asset.purchaseDate) {
                updateData.purchaseDate = purchaseDate;
            }
            if (warrantyExpiry !== asset.warrantyExpiry) {
                updateData.warrantyExpiry = warrantyExpiry;
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
                showSnackbar("No updates to save", 'info');
                setIsEditMode(false);
                return;
            }

            const response = await axios.put(
                `${baseURL}/api/assets/assetId?assetId=${asset.id}`,
                updateData
            );

            if (response.status === 200) {
                showSnackbar("Asset updated successfully", 'success');
                setIsEditMode(false);
                // Update the asset object with new values
                asset.assetName = assetName;
                if (updateData.category) {
                    asset.category = selectedCategory;
                }
                asset.controllerKey = isControllerCategory
                    ? (String(controllerKey || '').trim() || null)
                    : null;
                asset.modelNumber = modelNumber;
                asset.serialNumber = serialNumber;
                asset.price = price;
                asset.purchaseDate = purchaseDate;
                asset.warrantyExpiry = warrantyExpiry;
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
            showSnackbar(errorMsg, 'error');
        }
    };
    
    const handleEditToggle = () => {
        if (isEditMode) {
            // Cancel edit mode - reset fields
            setAssetName(asset?.assetName || '');
            setSelectedCategory(String(asset?.category || ''));
            setControllerKey(String(asset?.controllerKey || ''));
            setModelNumber(asset?.modelNumber || '');
            setSerialNumber(asset?.serialNumber || '');
            setPrice(asset?.price || '');
            setWarrantyExpiry(asset?.warrantyExpiry || '');
            setPurchaseDate(asset?.purchaseDate || '');
            setLocation(asset?.location || '');
            setProjectName(asset?.projectName || '');
            setAssignedDate(asset?.assignedDate || '');
            setStatusValue(asset?.status || '');
            setAssignedTo(asset?.assignedTo || 'Admin Role');
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
                    {/* Right Details Panel */}
                    <View style={[styles.rightPanel, isMobileLayout && styles.mobileRightPanel]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#E6F3FF" />
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
                                <Feather name="user" size={16} color="#A9C6E4" />
                                {/* <Text style={styles.userText}>Supervisor</Text> */}
                                {/* <Switch
                                    trackColor={{ false: "#E9E9EA", true: "#34C759" }}
                                    thumbColor={"#f4f3f4"} value={true}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                /> */}
                                <Feather name="settings" size={20} color="#A9C6E4" style={{ marginLeft: 5 }} />
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
                                        editable={isEditMode && !isAssignedCardEdit}
                                        onChangeText={setAssetName}
                                    />
                                    <DisplayField
                                        label="Category"
                                        value={selectedCategory}
                                        icon="layers"
                                    >
                                        {isEditMode && !isAssignedCardEdit ? (
                                            <FieldPicker
                                                value={selectedCategory}
                                                placeholder="Select Category"
                                                onPress={() => setShowCategoryPicker(true)}
                                            />
                                        ) : (
                                            <Text style={styles.valueText}>{selectedCategory || 'N/A'}</Text>
                                        )}
                                    </DisplayField>
                                    {isControllerCategory && (
                                        <DisplayField
                                            label="Controller Key"
                                            value={controllerKey}
                                            icon="hash"
                                            editable={false}
                                            onChangeText={setControllerKey}
                                        />
                                    )}
                                    <DisplayField
                                        label="Status"
                                        value={statusValue || 'N/A'}
                                        icon="check-circle"
                                    >
                                        {isEditMode && !isAssignedCardEdit ? (
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
                                        editable={isEditMode && !isAssignedCardEdit}
                                        onChangeText={setModelNumber}
                                    />
                                    <DisplayField 
                                        label="Serial Number" 
                                        value={serialNumber} 
                                        icon="hash" 
                                        editable={isEditMode && !isAssignedCardEdit}
                                        onChangeText={setSerialNumber}
                                    />
                                    <DisplayField 
                                        label="Price" 
                                        value={price} 
                                        icon="dollar" 
                                        editable={isEditMode && !isAssignedCardEdit}
                                        onChangeText={setPrice}
                                    />
                                </View>

                                <View style={styles.formColumn}>
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
                                                <Feather name="camera" size={32} color="#A9C6E4" />
                                                <Text style={styles.mobileUploadText}>Add Photo</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
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
                                                <Feather name="maximize" size={24} color="#A9C6E4" />
                                                <Text style={styles.barcodeUploadText}>Upload Barcode</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                   
                                    <DisplayField 
                                        label="Location"
                                        value={location}
                                        icon="map-pin"
                                        editable={isEditMode}
                                        onChangeText={setLocation}
                                    />
                                    <DisplayField
                                        label="Project Name"
                                        value={projectName}
                                        icon="briefcase"
                                        editable={isEditMode && isAssignedCardEdit}
                                        onChangeText={setProjectName}
                                    />
                                    <View style={{ marginBottom: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 5 }}>
                                            {iconMap.calendar}
                                            <Text style={{ fontSize: 12, color: '#A9C6E4', fontWeight: '500' }}>Assigned Date</Text>
                                        </View>
                                        <View
                                            style={[
                                                {
                                                    backgroundColor: 'rgba(18, 45, 73, 0.86)',
                                                    borderRadius: 8,
                                                    paddingHorizontal: 15,
                                                    paddingVertical: 10,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(159, 207, 255, 0.22)',
                                                },
                                                isEditMode && isAssignedCardEdit && {
                                                    backgroundColor: 'rgba(7, 24, 42, 0.9)',
                                                    borderColor: '#34D399',
                                                    borderWidth: 2,
                                                },
                                            ]}
                                        >
                                            {isEditMode && isAssignedCardEdit ? (
                                                Platform.OS === 'web' ? (
                                                    <input
                                                        type="date"
                                                        value={assignedDate}
                                                        onChange={(e) => setAssignedDate(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            height: 44,
                                                            padding: '10px',
                                                            borderRadius: 8,
                                                            border: '1px solid rgba(159, 207, 255, 0.22)',
                                                            background: 'transparent',
                                                            color: '#E6F3FF',
                                                            fontSize: 14,
                                                        }}
                                                    />
                                                ) : (
                                                    <>
                                                        <TouchableOpacity
                                                            style={styles.inlinePicker}
                                                            onPress={() => setShowAssignedDatePicker(true)}
                                                        >
                                                            <Text style={[styles.inlinePickerText, !assignedDate && styles.inlinePickerPlaceholder]}>
                                                                {assignedDate || 'Select Date'}
                                                            </Text>
                                                            <Ionicons name="chevron-down" size={16} color="#A9C6E4" />
                                                        </TouchableOpacity>
                                                        {showAssignedDatePicker && (
                                                            <DateTimePicker
                                                                value={assignedDate ? new Date(assignedDate) : new Date()}
                                                                mode="date"
                                                                onChange={(event, selectedDate) => {
                                                                    setShowAssignedDatePicker(false);
                                                                    if (selectedDate) {
                                                                        setAssignedDate(selectedDate.toISOString().split('T')[0]);
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </>
                                                )
                                            ) : (
                                                <Text style={styles.valueText}>{assignedDate || 'N/A'}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <DisplayField label="Assigned To" value={assignedTo || "Admin Role"} icon="user-check">
                                        {isEditMode && !isAssignedCardEdit ? (
                                            <FieldPicker
                                                value={assignedTo}
                                                placeholder="Select Admin"
                                                onPress={() => setShowAssigneePicker(true)}
                                            />
                                        ) : (
                                            <Text style={styles.valueText}>{assignedTo || 'Admin Role'}</Text>
                                        )}
                                    </DisplayField>
                                    <DisplayField
                                        label="Warranty Expiry"
                                        value={warrantyExpiry}
                                        icon="calendar"
                                        editable={isEditMode && !isAssignedCardEdit}
                                        onChangeText={setWarrantyExpiry}
                                    />
                                    <DisplayField
                                        label="Purchase Date"
                                        value={purchaseDate}
                                        icon="calendar"
                                        editable={isEditMode && !isAssignedCardEdit}
                                        onChangeText={setPurchaseDate}
                                    />
                                </View>
                            </View>
                        </ScrollView>
                        
                        {/* Action Buttons */}
                        <View style={[styles.footer, isMobileLayout && { justifyContent: 'space-between' }]}>
                            <TouchableOpacity 
                                style={isMobileLayout && { flex: 1 }}
                                onPress={isEditMode ? handleSaveAsset : handleEditToggle}
                            >
                                <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.saveButton}>
                                    <Text style={styles.buttonText}>
                                        {isEditMode
                                            ? 'SAVE CHANGES'
                                            : isAssignedCardEdit
                                                ? 'EDIT ASSIGNED ASSET'
                                                : 'EDIT ASSET'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.cancelButton, isMobileLayout && { flex: 1 }]} 
                                onPress={isEditMode ? handleEditToggle : () => navigation.goBack()}
                            >
                                <Text style={[styles.buttonText, { color: '#A9C6E4' }]}> 
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

                {/* Category Picker Modal */}
                <Modal
                    visible={showCategoryPicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCategoryPicker(false)}
                >
                    <View style={styles.pickerModalBackdrop}>
                        <View style={styles.pickerModalCard}>
                            <Text style={styles.pickerModalTitle}>Select Category</Text>
                            <ScrollView style={styles.pickerList}>
                                {categories.map((c: any, index: number) => {
                                    const value = String(c?.category || '');
                                    return (
                                        <TouchableOpacity
                                            key={`${value}-${index}`}
                                            style={styles.pickerModalItem}
                                            onPress={() => {
                                                setSelectedCategory(value);
                                                if (String(value || '').trim().toLowerCase() !== 'controller') {
                                                    setControllerKey('');
                                                }
                                                setShowCategoryPicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerModalItemText}>{value}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.pickerModalCloseBtn}
                                onPress={() => setShowCategoryPicker(false)}
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
                                Select Admin
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


// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
    fieldContainer: { marginBottom: 12 },
    labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 5 },
    label: { fontSize: 12, color: globalColors.textBody, fontWeight: '500' }, // Light text
    fieldIcon: { marginRight: 6 },
    valueBox: {
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    editableBox: {
        backgroundColor: 'rgba(7, 24, 42, 0.9)',
        borderColor: '#34D399',
        borderWidth: 2,
    },
     valueText: {
        fontSize: 14,
        color: '#E6F3FF',
        fontWeight: '500',
    },
    editableText: {
        fontSize: 14,
        color: '#E6F3FF',
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
        color: '#E6F3FF',
        fontWeight: '500',
    },
    inlinePickerPlaceholder: {
        color: '#A9C6E4',
    },
    pickerModalBackdrop: {
        flex: 1,
        backgroundColor: globalColors.overlayDark,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    pickerModalCard: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        backgroundColor: 'rgba(7, 24, 42, 0.9)',
        borderRadius: 12,
        padding: 16,
    },
    pickerModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        color: '#E6F3FF',
    },
    pickerList: {
        maxHeight: 320,
    },
    pickerModalItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(159, 207, 255, 0.22)',
    },
    pickerModalItemText: {
        fontSize: 14,
        color: '#E6F3FF',
    },
    pickerModalCloseBtn: {
        marginTop: 12,
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
    },
    pickerModalCloseText: {
        color: '#E6F3FF',
        fontWeight: '600',
    },
});

export default AssetFullDetails;