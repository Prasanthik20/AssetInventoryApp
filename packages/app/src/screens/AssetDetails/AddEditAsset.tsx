import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ImageBackground, TouchableOpacity, Image, TextInput, Modal,
  FlatList, Platform, ScrollView, Alert, useWindowDimensions,
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
            <Ionicons name="close" size={24} color="#333" />
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
  const { categories, statuses } = useAssetMeta();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const styles = addStyles(isMobileLayout);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showPurchasePicker, setShowPurchasePicker] = useState(false);
  const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);

  const locations = ["Office", "Field"];

  const [assetData, setAssetData] = useState<Omit<Asset, 'assetId'>>({
    id: 0,
    assetName: "",
    category: "",
    status: "Unassigned",
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

  useEffect(() => {
    if (categories?.length || statuses?.length) {
      setAssetData((prev) => ({
        ...prev,
        category: prev.category || categories?.[0]?.category || "",
        status: prev.status || statuses?.[0]?.status || "Unassigned",
      }));
    }
  }, [categories, statuses]);

  const handleInputChange = (field: keyof Asset, value: any) =>
    setAssetData((prev) => ({ ...prev, [field]: value }));

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
          const dataURL = await toPersistentDataUrl(
            result.assets[0].uri,
            result.assets[0].mimeType || undefined
          );
          handleInputChange('photoURL', dataURL);
        } catch (readError) {
          console.warn("Could not read file, using URI:", readError);
          handleInputChange('photoURL', result.assets[0].uri);
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
          const dataURL = await toPersistentDataUrl(
            result.assets[0].uri,
            result.assets[0].mimeType || undefined
          );
          handleInputChange('barcode', dataURL);
        } catch (readError) {
          console.warn("Could not read barcode file, using URI:", readError);
          handleInputChange('barcode', result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking barcode image:", error);
      Alert.alert("Error", "Failed to select barcode image");
    }
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

  const handleCreate = async () => {
    try {
      const res = await axios.post(
        `${baseURL}/api/assets/create`,
        assetData,
        { headers: { "Content-Type": "application/json" } }
      );

      const data = res.data;
      if (res.status !== 201) {
        alert(data.message || "Something went wrong");
        return;
      }

      alert("Asset created successfully ✅");
      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.response?.data?.message || "Failed to create asset";
      alert(errorMessage);
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
          
          {/* Left Side: Branding */}
          {!isMobileLayout && (
          <LinearGradient
            colors={['rgba(59, 89, 184, 0.85)', 'rgba(93, 113, 200, 0.8)']}
            style={styles.leftPanel}
          >
            <TouchableOpacity 
              onPress={handleImageUpload}
              style={styles.imageUploadContainer}
            >
              {assetData.photoURL ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: assetData.photoURL }}
                    style={styles.leftPanelImage}
                  />
                  <View style={styles.editOverlay}>
                    <Feather name="edit-2" size={24} color="#fff" />
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholderLarge}>
                  <Feather name="camera" size={48} color="#fff" />
                  <Text style={styles.uploadTextLarge}>Upload Asset Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.leftPanelTitle}>ASSET{"\n"}DETAILS</Text>
            <Text style={styles.leftPanelSubtitle}>EQUIPMENT RECORD SYSTEM</Text>
            <Text style={styles.brandName}>ASSETFLOW PRO</Text>
          </LinearGradient>
        )}

          {/* Right Side: Form */}
          <View style={[styles.rightPanel, isMobileLayout && { margin: 0, borderRadius: 0, flex: 1 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add New Asset</Text>
              <View style={styles.headerRight}>
                <Feather name="user" size={14} color="#3B59B8" />
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
                    <Feather name="truck" size={16} color="#3B59B8" style={styles.inputIcon} />
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
                    <Ionicons name="layers-outline" size={18} color="#3B59B8" />
                  </TouchableOpacity>

                  <Text style={styles.label}>Status</Text>
                  <TouchableOpacity style={styles.pickerInput} onPress={() => setShowStatusPicker(true)}>
                    <Text style={styles.pickerText}>{assetData.status}</Text>
                    <Ionicons name="radio-button-on" size={18} color="#3B59B8" />
                  </TouchableOpacity>

                  <Text style={styles.label}>Model Number</Text>
                  <View style={styles.inputGroup}>
                    <Feather name="package" size={16} color="#3B59B8" style={styles.inputIcon} />
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
                    <Feather name="package" size={16} color="#3B59B8" style={styles.inputIcon} />
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

                  {/* Mobile Image Upload */}
                  {isMobileLayout && (
                    <>
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
                            <Feather name="camera" size={24} color="#3B59B8" />
                            <Text style={styles.uploadText}>Upload Photo</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  <Text style={styles.label}>Current Location</Text>
                  <TouchableOpacity style={styles.pickerInput} onPress={() => setShowLocationPicker(true)}>
                    <Text style={styles.pickerText}>{assetData.location}</Text>
                    <Ionicons name="location-outline" size={18} color="#3B59B8" />
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
                      <Feather name="calendar" size={16} color="#3B59B8" />
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
                      <Feather name="shield" size={16} color="#3B59B8" />
                      <Text style={styles.dateText}>{assetData.warrantyExpiry || "Select Expiry Date"}</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.label}>Purchase Price</Text>
                  <View style={styles.inputGroup}>
                    <Feather name="dollar-sign" size={16} color="#3B59B8" style={styles.inputIcon} />
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
                        <Feather name="maximize" size={24} color="#3B59B8" />
                        <Text style={styles.uploadText}>Upload Barcode</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleCreate} activeOpacity={0.8}>
                <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.saveButton}>
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
      </SafeAreaView>
    </ImageBackground>
  );
};

export default AddEditAsset;