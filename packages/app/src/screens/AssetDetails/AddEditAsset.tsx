import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ImageBackground, TouchableOpacity, Image, TextInput, Modal,
  FlatList, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import DateTimePicker from '@react-native-community/datetimepicker';
import useAssetMeta from "../../hooks/useAssetMeta";
import { Asset, baseURL, RootStackParamList } from "../../navigation/types";
import axios from 'axios';

type NavigationProp = StackNavigationProp<RootStackParamList, "AddEditAsset">;
const isMobileDevice = Platform.OS !== 'web';

/**
 * Reusable Modal for Pickers
 */
const CustomPickerModal = ({ visible, title, data, onSelect, onClose, keyLabel }: any) => (
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
      const res = await axios.post(`${baseURL}/api/assets/create`, {
        headers: { "Content-Type": "application/json" },
        data: assetData,
      });

      const data = res.data;
      if (res.status !== 200) {
        alert(data.message || "Something went wrong");
        return;
      }

      alert("Asset created successfully ✅");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      alert("Failed to create asset");
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
          {!isMobileDevice && (
          <LinearGradient
            colors={['rgba(59, 89, 184, 0.85)', 'rgba(93, 113, 200, 0.8)']}
            style={styles.leftPanel}
          >
            <Image
              source={{ uri: 'https://i.imgur.com/gYf2xmm.png' }}
              style={styles.leftPanelImage}
            />
            <Text style={styles.leftPanelTitle}>ASSET{"\n"}DETAILS</Text>
            <Text style={styles.leftPanelSubtitle}>EQUIPMENT RECORD SYSTEM</Text>
            <Text style={styles.brandName}>ASSETFLOW PRO</Text>
          </LinearGradient>
        )}

          {/* Right Side: Form */}
          <View style={[styles.rightPanel, isMobileDevice && { margin: 0, borderRadius: 0, flex: 1 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add New Asset</Text>
              <View style={styles.headerRight}>
                <Feather name="user" size={14} color="#3B59B8" />
                <Text style={styles.userText}>Supervisor</Text>
              </View>
            </View>

            <ScrollView 
            scrollEnabled={isMobileDevice} // Disables internal scroll on web if preferred
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ flexGrow: 1 }}
          >
              <View style={[styles.formBody, isMobileDevice && { flexDirection: 'column', gap: 0 }]}>
                
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

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  safeArea: { flex: 1 },
  container: { flex: 1, flexDirection: 'row' },
  leftPanel: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  leftPanelImage: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 20 },
  leftPanelTitle: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 38 },
  leftPanelSubtitle: { fontSize: 12, color: '#fff', marginTop: 10, opacity: 0.8, letterSpacing: 1.5, textAlign: 'center' },
  brandName: { fontSize: 14, color: '#fff', marginTop: 40, fontWeight: 'bold', opacity: 0.6 },
  
  rightPanel: {
   flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    // Margin is removed on mobile via the inline style in the component
    margin: 20, 
    borderRadius: 30,
    padding: 20,
    elevation: 5,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backCircle: { backgroundColor: '#fff', padding: 8, borderRadius: 20, elevation: 2 , marginTop:10},
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', textAlign: 'center', flex: 1, marginTop: 10 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee'
  },
  userText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#3B59B8', marginTop : 10 },
  dateText: { marginLeft: 10, fontSize: 14, color: '#333' },
  formBody: { flexDirection: 'row', // Default for Web
    gap: 20, 
    flex: 1 },
  formColumn: { flex: 1 , width: '100%',},
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#3B59B8', 
    marginBottom: 15, 
    marginTop: isMobileDevice ? 10 : 0, // Add spacing between stacked sections
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5
  },
  label: { fontSize: 12, color: '#444', marginBottom: 6, fontWeight: '700', marginLeft: 4 },
  inputGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 18,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  pickerInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 18,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerText: { color: '#333', fontSize: 14, fontWeight: '500' },
  
  footer: {
paddingTop: 20,
    paddingBottom: isMobileDevice ? 10 : 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    // Align button to right on web, center on mobile
    alignItems: isMobileDevice ? 'center' : 'flex-end',  },
  webDatePicker: {
    width: '100%',
    height: 45,
    borderRadius: 10,
    border: '1px solid #ddd',
    paddingVertical: 0,
    paddingHorizontal: 12,
    marginBottom: 15,
    fontSize: '14px',
    fontFamily: 'inherit'
  } as any,
  saveButton: {paddingVertical: 14, 
    paddingHorizontal: 40, 
    borderRadius: 15,
    alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", borderRadius: 20, width: "35%", maxHeight: "60%", overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: "#f9f9f9", alignItems: 'center' },
  modalItemText: { fontSize: 14, color: "#333", fontWeight: '500' },
});

export default AddEditAsset;