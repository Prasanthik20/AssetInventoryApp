import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ImageBackground, TouchableOpacity, Switch, Image, TextInput, Modal,
  FlatList, Pressable,Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import DateTimePicker from '@react-native-community/datetimepicker';
import useAssetMeta from "../../hooks/useAssetMeta";
import { Asset, RootStackParamList } from "../../navigation/types";

type NavigationProp = StackNavigationProp<RootStackParamList, "AddEditAsset">;

const AddEditAsset: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { categories, statuses } = useAssetMeta();

  const [isEnabled, setIsEnabled] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Mobile Date Picker Visibility
  const [showPurchasePicker, setShowPurchasePicker] = useState(false);
  const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);

  const locations = ["Office", "Field"];

  const [assetData, setAssetData] = useState<Omit<Asset, 'assetId'>>({
    assetName: "",
    category: "",
    status: "Unassigned",
    location: "Office",
    modelNumber: "",
    serialNumber: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiry: "",
    price: "",
  });


  // Keep assetData in sync if categories/statuses arrive after mount
 useEffect(() => {
    if (categories?.length || statuses?.length) {
      setAssetData((prev) => ({
        ...prev,
        category: prev.category || categories?.[0]?.category || "",
        status: prev.status || statuses?.[0]?.status || "Unassigned",
      }));
    }
  }, [categories, statuses]);

  const handleInputChange = (field: keyof Asset, value: string) =>
    setAssetData((prev) => ({ ...prev, [field]: value }));

  const onDateChange = (field: 'purchaseDate' | 'warrantyExpiry', event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPurchasePicker(false);
      setShowWarrantyPicker(false);
    }
    if (selectedDate) {
      handleInputChange(field, selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleSelectCategory = (c: { id: number | string; category: string }) => {
    setAssetData((prev) => ({ ...prev, category: c.category }));
    setShowCategoryPicker(false);
  };

  const handleSelectStatus = (s: { id: number | string; status: string }) => {
    setAssetData((prev) => ({ ...prev, status: s.status }));
    setShowStatusPicker(false);
  };
 const handleCreate = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/assets/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assetData),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
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
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Left Decorative Panel */}
          <LinearGradient
            // --- MODIFICATION: Made gradient semi-transparent ---
            colors={['rgba(93, 113, 200, 0.7)', 'rgba(59, 89, 184, 0.8)']}
            style={styles.leftPanel}
          >
            <Image
              source={{ uri: 'https://i.imgur.com/gYf2xmm.png' }}
              style={styles.leftPanelImage}
            />
            <Text style={styles.leftPanelTitle}>ASSET DETAILS</Text>
            <Text style={styles.leftPanelSubtitle}>COMPREHENSIVE EQUIPMENT RECORD</Text>
            <Text style={styles.brandName}>ASSETFLOW PRO</Text>
          </LinearGradient>

          {/* Right Form Panel */}
          <View style={styles.rightPanel}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000000ff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add New Asset</Text>
              <View style={styles.headerRight}>
                <Feather name="user" size={16} color="#333" />
                <Text style={styles.userText}>Supervisor</Text>
              </View>
            </View>

            {/* Form Body */}
            <View style={styles.formBody}>
              {/* Left Column */}
              <View style={styles.formColumn}>
                <Text style={styles.sectionTitle}>General Details</Text>

                <View style={styles.inputGroup}>
                  <Feather name="truck" size={16} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Asset Name"
                    value={assetData.assetName}
                    onChangeText={v => handleInputChange('assetName', v)}
                  />
                </View>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity style={styles.pickerInput} onPress={() => setShowCategoryPicker(true)}>
                  <Text style={styles.pickerText}>{assetData.category || "Select Category"}</Text>
                  <Ionicons name="chevron-down" size={18} color="#555" />
                </TouchableOpacity>

                <Text style={styles.label}>Status</Text>
                <TouchableOpacity style={styles.pickerInput} onPress={() => setShowStatusPicker(true)}>
                  <Text style={styles.pickerText}>{assetData.status}</Text>
                  <Ionicons name="chevron-down" size={18} color="#555" />
                </TouchableOpacity>

                <Text style={styles.label}>Model Number</Text>
                <View style={styles.inputGroup}>
                  <Feather name="package" size={16} color="#888" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="Model #" 
                    value={assetData.modelNumber} 
                    onChangeText={v => handleInputChange('modelNumber', v)} 
                  />
                </View>

                <Text style={styles.label}>Serial Number</Text>
                <View style={styles.inputGroup}>
                  <Feather name="hash" size={16} color="#888" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="S/N" 
                    value={assetData.serialNumber} 
                    onChangeText={v => handleInputChange('serialNumber', v)} 
                  />
                </View>
              </View>

              {/* Right Column */}
              <View style={styles.formColumn}>
                <Text style={styles.sectionTitle}>Acquisition Info</Text>

                {/* LOCATION DROPDOWN */}
                <Text style={styles.label}>Current Location</Text>
                <TouchableOpacity style={styles.pickerInput} onPress={() => setShowLocationPicker(true)}>
                  <Text style={styles.pickerText}>{assetData.location}</Text>
                  <Ionicons name="chevron-down" size={18} color="#555" />
                </TouchableOpacity>
                
                <Text style={styles.label}>Purchase Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={assetData.purchaseDate}
                    onChange={(e) =>
                      handleInputChange("purchaseDate", e.target.value)
                    }
                    style={styles.webDateInput as any}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.inputGroup}
                    onPress={() => setShowPurchasePicker(true)}
                  >
                    <Feather name="calendar" size={16} color="#888" style={styles.inputIcon} />
                    <Text style={styles.textInput}>
                      {assetData.purchaseDate || "Select date"}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.label}>Warranty Expiry</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={assetData.warrantyExpiry}
                    onChange={(e) =>
                      handleInputChange("warrantyExpiry", e.target.value)
                    }
                    style={styles.webDateInput as any}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.inputGroup}
                    onPress={() => setShowWarrantyPicker(true)}
                  >
                    <Feather name="calendar" size={16} color="#888" style={styles.inputIcon} />
                    <Text style={styles.textInput}>
                      {assetData.warrantyExpiry || "Select date"}
                    </Text>
                  </TouchableOpacity>
                )}

               <Text style={styles.label}>Purchase Price</Text>
                <View style={styles.inputGroup}>
                    <Feather name="dollar-sign" size={16} color="#888" style={styles.inputIcon} />
                    <TextInput 
                    style={styles.textInput} 
                    placeholder="0.00" 
                    value={assetData.price} 
                    onChangeText={v => handleInputChange('price', v)} 
                    keyboardType="numeric" 
                    />
                </View>
              </View>
            </View>

          <View style={styles.footer}>
              <TouchableOpacity onPress={handleCreate}>
                <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.saveButton}>
                  <Text style={styles.buttonText}>CREATE ASSET</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showPurchasePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={
              assetData.purchaseDate
                ? new Date(assetData.purchaseDate)
                : new Date()
            }
            mode="date"
            display="default"
            onChange={(event, date) =>
              onDateChange("purchaseDate", event, date)
            }
          />
        )}

        {showWarrantyPicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={
              assetData.warrantyExpiry
                ? new Date(assetData.warrantyExpiry)
                : new Date()
            }
            mode="date"
            display="default"
            onChange={(event, date) =>
              onDateChange("warrantyExpiry", event, date)
            }
          />
        )}
        {/* Category Picker Modal */}
        <Modal visible={showCategoryPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => handleSelectCategory(item)}
                  >
                    <Text style={styles.modalItemText}>{item.category}</Text>
                  </Pressable>
                )}
              />
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Text style={{ color: "#fff" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Location Picker Modal */}
        <Modal
          visible={showLocationPicker} // <--- FIX: Ensure this is used here
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={[styles.sectionTitle, { padding: 15 }]}>Select Location</Text>
              {locations.map((loc) => (
                <Pressable
                  key={loc}
                  style={styles.modalItem}
                  onPress={() => {
                    handleInputChange('location', loc);
                    setShowLocationPicker(false); // Closes the modal after selection
                  }}
                >
                  <Text style={styles.modalItemText}>{loc}</Text>
                </Pressable>
              ))}
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowLocationPicker(false)}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Status Picker Modal */}
        <Modal visible={showStatusPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <FlatList
                data={statuses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => handleSelectStatus(item)}
                  >
                    <Text style={styles.modalItemText}>{item.status}</Text>
                  </Pressable>
                )}
              />
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowStatusPicker(false)}
              >
                <Text style={{ color: "#fff" }}>Close</Text>
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
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: { flex: 1 },
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
  leftPanelImage: { width: 180, height: 180, resizeMode: 'contain', marginBottom: 20 },
  leftPanelTitle: { fontSize: 30, fontWeight: 'bold', color: '#000000ff', textAlign: 'center' },
  leftPanelSubtitle: { fontSize: 13, color: '#000000ff', marginTop: 10, opacity: 0.8, letterSpacing: 1 },
  brandName: { fontSize: 15, color: '#000000ff', marginTop: 30, opacity: 0.8 },
  rightPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Semi-transparent
    padding: 25,
    display: 'flex',
    flexDirection: 'column',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backButton: { position: 'absolute', left: 0, zIndex: 1, padding: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000ff', textAlign: 'center', flex: 1 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  userText: { marginLeft: 8, marginRight: 8, fontSize: 14, fontWeight: '500' },
  formBody: { flexDirection: 'row', gap: 25, flex: 1 },
  formColumn: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#000000ff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 5 },
  label: { fontSize: 12, color: '#000000ff', marginBottom: 4, fontWeight: '500', marginLeft: 5 },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    color: '#1A202C',
    fontWeight: '500',
  },
  singleTextInput: {
    marginBottom: 12,
  },
  inputGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 8 },
  pickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  pickerText: { color: '#1A202C', fontSize: 14, fontWeight: '500' },
  rowInputContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  barcodeImage: {
    width: '100%',
    height: 70,
    resizeMode: 'contain',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 5,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  webDateInput: {
  height: 44,
 // borderRadius: 10,
 // border: "1px solid #ddd",
  paddingHorizontal: 12,
  fontSize: 14,
  width: "100%",
},
  barcodeText: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#fff' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, backgroundColor: 'rgba(234, 234, 234, 0.8)', marginLeft: 15 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", borderRadius: 10, width: "80%", maxHeight: "50%" },
  modalItem: { paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#eee", minHeight: 32, justifyContent: "center" },
  modalClose: { backgroundColor: "#27B2C3", paddingVertical: 10, alignItems: "center", borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  modalItemText: { fontSize: 13, color: "#333", },

});

export default AddEditAsset;