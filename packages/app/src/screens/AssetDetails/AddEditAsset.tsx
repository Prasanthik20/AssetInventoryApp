import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, ImageBackground, TouchableOpacity, Image, TextInput, Modal,
  FlatList, Platform, ScrollView, useWindowDimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import DateTimePicker from '@react-native-community/datetimepicker';
import useAssetMeta from "../../hooks/useAssetMeta";
import { Asset, baseURL, RootStackParamList } from "../../navigation/types";
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { addStyles } from './addstyles';

type NavigationProp = StackNavigationProp<RootStackParamList, "AddEditAsset">;

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

/**
 * Reusable Modal for Pickers
 */

const CustomPickerModal = ({ visible, title, data, onSelect, onClose, keyLabel, styles }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#A9C6E4" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.modalItem} 
              onPress={() => onSelect(item)}
            >
              <Text style={styles.modalItemText}>{keyLabel ? item[keyLabel] : item}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

const AddEditAsset: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { statuses, categories } = useAssetMeta();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const styles = addStyles(isMobileLayout);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showPurchasePicker, setShowPurchasePicker] = useState(false);
  const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    kind: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', kind: 'info' });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locations = ["Office", "Field"];

  const getInitialAssetData = (): Omit<Asset, 'assetId'> => ({
    id: 0,
    assetName: "",
    category: categories?.[0]?.category || "",
    controllerKey: "",
    status: statuses?.[0]?.status || "Unassigned",
    location: "Office",
    modelNumber: "",
    serialNumber: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiry: "",
    price: "",
    barcode: "",
    photoURL: "",
    assignmentId: 0,
    isOverdue: false,
  });

  const [assetData, setAssetData] = useState<Omit<Asset, 'assetId'>>(getInitialAssetData);
  const isControllerCategory = String(assetData.category || '').trim().toLowerCase().includes('controller');

  useEffect(() => {
    if (categories?.length || statuses?.length) {
      setAssetData((prev) => ({
        ...prev,
        category: prev.category || categories?.[0]?.category || "",
        status: prev.status || statuses?.[0]?.status || "Unassigned",
      }));
    }
  }, [categories, statuses]);

  useEffect(() => {
    if (!isControllerCategory && assetData.controllerKey) {
      setAssetData((prev) => ({ ...prev, controllerKey: '' }));
    }
  }, [assetData.controllerKey, isControllerCategory]);

  const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
    }
    setSnackbar({ visible: true, message, kind });
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (field: keyof Asset, value: any) =>
    setAssetData((prev) => ({ ...prev, [field]: value }));

  const handleImageUpload = async () => {
    if (Platform.OS === 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showSnackbar("Please allow access to your photo library.", 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      processImageResult(result, 'photoURL');
      return;
    }

    Alert.alert(
      "Select Image",
      "Choose a source for your asset photo",
      [
        {
          text: "Camera",
          onPress: () => launchCamera('photoURL', [1, 1])
        },
        {
          text: "Gallery",
          onPress: () => launchLibrary('photoURL', [1, 1])
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const launchCamera = async (field: keyof Asset, aspect: [number, number] = [1, 1]) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showSnackbar("Please allow access to your camera.", 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      processImageResult(result, field);
    } catch (error) {
      console.error("Error launching camera:", error);
      showSnackbar("Failed to open camera.", 'error');
    }
  };

  const launchLibrary = async (field: keyof Asset, aspect: [number, number] = [1, 1]) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showSnackbar("Please allow access to your photo library.", 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      processImageResult(result, field);
    } catch (error) {
      console.error("Error picking image:", error);
      showSnackbar("Failed to select image.", 'error');
    }
  };

  const processImageResult = async (result: ImagePicker.ImagePickerResult, field: keyof Asset) => {
    if (!result.canceled && result.assets[0]) {
      try {
        const dataURL = await toPersistentDataUrl(
          result.assets[0].uri,
          result.assets[0].mimeType || undefined
        );
        handleInputChange(field, dataURL);
      } catch (readError) {
        console.warn(`Could not read file for ${field}, using URI:`, readError);
        handleInputChange(field, result.assets[0].uri);
      }
    }
  };

  const handleBarcodeUpload = async () => {
    if (Platform.OS === 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showSnackbar("Please allow access to your photo library.", 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 1],
        quality: 0.8,
      });
      processImageResult(result, 'barcode');
      return;
    }

    Alert.alert(
      "Select Barcode Image",
      "Choose a source for your barcode image",
      [
        {
          text: "Camera",
          onPress: () => launchCamera('barcode', [4, 1])
        },
        {
          text: "Gallery",
          onPress: () => launchLibrary('barcode', [4, 1])
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  // Shared Date Change Handler
  const onDateChange = (field: 'purchaseDate' | 'warrantyExpiry', event: any, selectedDate?: Date) => {
    // Hide picker for Android after selection
    if (Platform.OS === 'android') {
      setShowPurchasePicker(false);
      setShowWarrantyPicker(false);
    }

    if (event.type === "set" && selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      handleInputChange(field, dateString);
    } else {
      // Handle cancel
      setShowPurchasePicker(false);
      setShowWarrantyPicker(false);
    }
  };

  const isValidDateString = (value?: string) => {
    if (!value) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  };

  const validateCreateForm = () => {
    const normalizedAssetName = String(assetData.assetName || '').trim();
    const normalizedCategory = String(assetData.category || '').trim();
    const normalizedStatus = String(assetData.status || '').trim();
    const normalizedSerial = String(assetData.serialNumber || '').trim();
    const normalizedLocation = String(assetData.location || '').trim();
    const normalizedPrice = String(assetData.price || '').trim();

    if (!normalizedAssetName) {
      showSnackbar('Asset name is required.', 'error');
      return false;
    }

    if (!normalizedCategory) {
      showSnackbar('Please select a category.', 'error');
      return false;
    }

    if (!normalizedStatus) {
      showSnackbar('Please select a status.', 'error');
      return false;
    }

    if (!normalizedSerial) {
      showSnackbar('Serial number is required.', 'error');
      return false;
    }

    if (!normalizedLocation) {
      showSnackbar('Please select a location.', 'error');
      return false;
    }

    if (assetData.purchaseDate && !isValidDateString(assetData.purchaseDate)) {
      showSnackbar('Please select a valid purchase date.', 'error');
      return false;
    }

    if (assetData.warrantyExpiry && !isValidDateString(assetData.warrantyExpiry)) {
      showSnackbar('Please select a valid warranty expiry date.', 'error');
      return false;
    }

    if (assetData.purchaseDate && assetData.warrantyExpiry) {
      const purchaseTime = new Date(assetData.purchaseDate).getTime();
      const warrantyTime = new Date(assetData.warrantyExpiry).getTime();
      if (warrantyTime < purchaseTime) {
        showSnackbar('Warranty expiry cannot be before purchase date.', 'error');
        return false;
      }
    }

    if (normalizedPrice) {
      const numericPrice = Number(normalizedPrice);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        showSnackbar('Price must be a valid non-negative number.', 'error');
        return false;
      }
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateCreateForm()) {
      return;
    }

    try {
      const payload = {
        ...assetData,
        assetName: String(assetData.assetName || '').trim(),
        category: String(assetData.category || '').trim(),
        controllerKey: isControllerCategory
          ? (String(assetData.controllerKey || '').trim() || null)
          : null,
        status: String(assetData.status || '').trim(),
        serialNumber: String(assetData.serialNumber || '').trim(),
        location: String(assetData.location || '').trim(),
        modelNumber: String(assetData.modelNumber || '').trim(),
        price: String(assetData.price || '').trim(),
      };

      const res = await axios.post(
        `${baseURL}/api/assets/create`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      const data = res.data;
      const isSuccess = res.status >= 200 && res.status < 300;
      if (!isSuccess) {
        throw new Error(data?.message || "Failed to create asset");
      }

      showSnackbar(data?.message || "Asset created successfully.", 'success');
      setAssetData(getInitialAssetData());
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to create asset";
      showSnackbar(errorMessage, 'error');
    }
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
          {/* Right Side: Form */}
          <View style={[styles.rightPanel, isMobileLayout && { margin: 0, borderRadius: 0, flex: 1 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#E6F3FF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add New Asset</Text>
              <View style={styles.headerRight}>
                <Feather name="user" size={14} color="#22D3EE" />
                {/* <Text style={styles.userText}>Supervisor</Text> */}
              </View>
            </View>

            <ScrollView 
            scrollEnabled={isMobileLayout} // Keep internal scroll on mobile/native and narrow web
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ flexGrow: 1 }}
          >
              <View style={[styles.formBody, isMobileLayout && { flexDirection: 'column', gap: 0 }]}>
                
                {/* Column 1 */}
                <View style={styles.formColumn}>
                  <Text style={styles.sectionTitle}>General Details</Text>
                  
                  <Text style={styles.label}>Asset Name</Text>
                  <View style={styles.inputGroup}>
                    <Feather name="truck" size={16} color="#22D3EE" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Asset Name"
                      placeholderTextColor="#999"
                      value={assetData.assetName}
                      onChangeText={v => handleInputChange('assetName', v)}
                    />
                  </View>

                  <Text style={styles.label}>Category</Text>
                  <TouchableOpacity style={styles.pickerInput} onPress={() => setShowCategoryPicker(true)}>
                    <Text style={styles.pickerText}>{assetData.category || "Select Category"}</Text>
                    <Ionicons name="layers-outline" size={18} color="#22D3EE" />
                  </TouchableOpacity>

                  {isControllerCategory && (
                    <>
                      <Text style={styles.label}>Controller Key</Text>
                      <View style={styles.inputGroup}>
                        <Feather name="key" size={16} color="#22D3EE" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Controller Key"
                          placeholderTextColor="#999"
                          value={String(assetData.controllerKey || '')}
                          onChangeText={v => handleInputChange('controllerKey', v)}
                        />
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Status</Text>
                  <TouchableOpacity style={styles.pickerInput} onPress={() => setShowStatusPicker(true)}>
                    <Text style={styles.pickerText}>{assetData.status}</Text>
                    <Ionicons name="radio-button-on" size={18} color="#22D3EE" />
                  </TouchableOpacity>

                  <Text style={styles.label}>Model Number</Text>
                  <View style={styles.inputGroup}>
                    <Feather name="package" size={16} color="#22D3EE" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.textInput} 
                      placeholder="Model #" 
                      placeholderTextColor="#999"
                      value={assetData.modelNumber} 
                      onChangeText={v => handleInputChange('modelNumber', v)} 
                    />
                  </View>

                  <Text style={styles.label}>Serial Number</Text>
                  <View style={styles.inputGroup}>
                    <Feather name="package" size={16} color="#22D3EE" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.textInput} 
                      placeholder="Serial Number" 
                      placeholderTextColor="#999"
                      value={assetData.serialNumber} 
                      onChangeText={v => handleInputChange('serialNumber', v)} 
                    />
                  </View>
                </View>

                {/* Column 2 */}
                <View style={styles.formColumn}>
                  <Text style={styles.sectionTitle}>Acquisition Info</Text>

                  <Text style={styles.label}>Asset Photo</Text>
                  <TouchableOpacity 
                    style={styles.imageUploadBox}
                    onPress={handleImageUpload}
                  >
                    {assetData.photoURL ? (
                      <Image 
                        source={{ uri: assetData.photoURL }} 
                        style={styles.photoPreview}
                      />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Feather name="camera" size={24} color="#22D3EE" />
                        <Text style={styles.uploadText}>Upload Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.label}>Current Location</Text>
                  <TouchableOpacity style={styles.pickerInput} onPress={() => setShowLocationPicker(true)}>
                    <Text style={styles.pickerText}>{assetData.location}</Text>
                    <Ionicons name="location-outline" size={18} color="#22D3EE" />
                  </TouchableOpacity>

                  {/* PURCHASE DATE CALENDAR */}
                  <Text style={styles.label}>Purchase Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      style={styles.webDatePicker as any}
                      value={assetData.purchaseDate}
                      onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                    />
                  ) : (
                    <TouchableOpacity 
                      style={styles.inputGroup} 
                      onPress={() => setShowPurchasePicker(true)}
                    >
                      <Feather name="calendar" size={16} color="#22D3EE" />
                      <Text style={styles.dateText}>{assetData.purchaseDate || "Select Date"}</Text>
                    </TouchableOpacity>
                  )}

                  {/* WARRANTY EXPIRY CALENDAR */}
                  <Text style={styles.label}>Warranty Expiry</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      style={styles.webDatePicker as any}
                      value={assetData.warrantyExpiry}
                      onChange={(e) => handleInputChange('warrantyExpiry', e.target.value)}
                    />
                  ) : (
                    <TouchableOpacity 
                      style={styles.inputGroup} 
                      onPress={() => setShowWarrantyPicker(true)}
                    >
                      <Feather name="shield" size={16} color="#22D3EE" />
                      <Text style={styles.dateText}>{assetData.warrantyExpiry || "Select Expiry Date"}</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.label}>Purchase Price</Text>
                  <View style={styles.inputGroup}>
                    <Feather name="dollar-sign" size={16} color="#22D3EE" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.textInput} 
                      placeholder="0.00" 
                      placeholderTextColor="#999"
                      value={assetData.price} 
                      onChangeText={v => handleInputChange('price', v)} 
                      keyboardType="numeric" 
                    />
                  </View>

                  <Text style={styles.label}>Barcode Image</Text>
                  <TouchableOpacity 
                    style={styles.imageUploadBox}
                    onPress={handleBarcodeUpload}
                  >
                    {assetData.barcode ? (
                      <Image 
                        source={{ uri: assetData.barcode }} 
                        style={styles.barcodePreview}
                      />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Feather name="maximize" size={24} color="#22D3EE" />
                        <Text style={styles.uploadText}>Upload Barcode</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleCreate} activeOpacity={0.8}>
                <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.saveButton}>
                  <Text style={styles.buttonText}>CREATE ASSET</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Picker Modals */}
        <CustomPickerModal 
          visible={showCategoryPicker}
          title="Select Category"
          data={categories}
          keyLabel="category"
          styles={styles}
          onSelect={(item: any) => {
            handleInputChange('category', item.category);
            if (!String(item?.category || '').trim().toLowerCase().includes('controller')) {
              handleInputChange('controllerKey', '');
            }
            setShowCategoryPicker(false);
          }}
          onClose={() => setShowCategoryPicker(false)}
        />

        <CustomPickerModal 
          visible={showStatusPicker}
          title="Select Status"
          data={statuses}
          keyLabel="status"
          styles={styles}
          onSelect={(item: any) => {
            handleInputChange('status', item.status);
            setShowStatusPicker(false);
          }}
          onClose={() => setShowStatusPicker(false)}
        />

        <CustomPickerModal 
          visible={showLocationPicker}
          title="Select Location"
          data={locations}
          styles={styles}
          onSelect={(loc: string) => {
            handleInputChange('location', loc);
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
        />

        {/* MOBILE DATE PICKER COMPONENTS */}
        {showPurchasePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={assetData.purchaseDate ? new Date(assetData.purchaseDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => onDateChange('purchaseDate', event, date)}
          />
        )}

        {showWarrantyPicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={assetData.warrantyExpiry ? new Date(assetData.warrantyExpiry) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => onDateChange('warrantyExpiry', event, date)}
          />
        )}

        {snackbar.visible && (
          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: isMobileLayout ? 16 : 22,
              zIndex: 1000,
            }}
          >
            <View
              style={{
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor:
                  snackbar.kind === 'success'
                    ? 'rgba(52, 211, 153, 0.55)'
                    : snackbar.kind === 'error'
                      ? 'rgba(248, 113, 113, 0.6)'
                      : 'rgba(159, 207, 255, 0.45)',
                backgroundColor:
                  snackbar.kind === 'success'
                    ? 'rgba(6, 78, 59, 0.95)'
                    : snackbar.kind === 'error'
                      ? 'rgba(127, 29, 29, 0.95)'
                      : 'rgba(15, 23, 42, 0.95)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: '#E6F3FF', flex: 1, fontWeight: '600' }}>{snackbar.message}</Text>
              <TouchableOpacity onPress={() => setSnackbar((prev) => ({ ...prev, visible: false }))}>
                <Ionicons name="close" size={18} color="#E6F3FF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

export default AddEditAsset;