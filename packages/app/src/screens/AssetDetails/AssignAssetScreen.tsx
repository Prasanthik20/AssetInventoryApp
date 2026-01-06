import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { Asset, RootStackParamList } from '../../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';

type AssignAssetNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AssignAsset'
>;

const AssignAssetScreen: React.FC = () => {
  const navigation = useNavigation<AssignAssetNavigationProp>();
  const route = useRoute<{
    key: string;
    name: string;
    params: {
      supervisor_employeeId: string;
      supervisorName: string;
    };
  }>();

  // ⬅️ Supervisor details from CompanyLoginScreen
  const supervisor_employeeId = route.params?.supervisor_employeeId;
  const supervisorName = route.params?.supervisorName
  console.log("Supervisor:", supervisor_employeeId, supervisorName);

  const today = new Date().toISOString().split('T')[0];

  // -------------------- STATES --------------------
  const [assets, setAssets] = useState<Asset[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);

  const [operatorModal, setOperatorModal] = useState(false);
  const [assetModal, setAssetModal] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [assignedDate, setAssignedDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const [showAssignedPicker, setShowAssignedPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  // -------------------- FETCH ASSETS --------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // ----- FETCH ASSETS -----
        const res = await axios.get("http://localhost:3000/api/assets");

        const rawData = res.data.assets || res.data || [];
        const normalizedAssets = rawData.map((a: any) => ({
          ...a,
          assetId: a.assetId || a.id,
        }));

        const unassignedAssets = normalizedAssets.filter(
          (a: any) => a.status?.toLowerCase() === 'unassigned'
        );

        // 🔥 REMOVE DUPLICATES BY assetId
        const uniqueAssets = Array.from(
          new Map(unassignedAssets.map(a => [a.assetId, a])).values()
        ) as Asset[];

        setAssets(uniqueAssets);
        // ----- FETCH OPERATORS -----
        const response = await axios.get("http://localhost:3000/api/auth/users");

        const rawUsers = response.data.users || response.data.data || response.data || [];

        const operatorsList = rawUsers.filter(
          (u: any) => u.role?.roleName?.toLowerCase() === "operator"
        );

        setOperators(operatorsList);
      } catch (err) {
        console.log(err);
        setError("Failed to fetch assets or operators");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -------------------- ASSIGN HANDLER --------------------
  const handleAssign = async () => {
    if (selectedAssets.length === 0) {
      Alert.alert('Error', 'Please select at least one asset');
      return;
    }
    if (!selectedOperator) {
      Alert.alert('Error', 'Please select an operator');
      return;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Please select expected return date');
      return;
    }

    try {
      // 🔥 Send the array of IDs to your bulk assignment API
      await axios.post('http://localhost:3000/api/assets/assign', {
        assetIds: selectedAssets.map(a => a.assetId), // Change asset_id to assetIds
        operator_employeeId: selectedOperator.employeeId,
        supervisor_employeeId: supervisor_employeeId,
        project_name: projectName,
        destination: location,
        assigned_date: assignedDate,
        expected_return_date: dueDate,
        notes,
      });

      Alert.alert('Success', `${selectedAssets.length} Assets assigned!`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to assign assets');
    }
  };

  const onAssignedChange = (event: any, selectedDate?: Date) => {
  setShowAssignedPicker(false); // Close picker
  if (selectedDate) {
    setAssignedDate(selectedDate.toISOString().split('T')[0]);
  }
};

const onDueChange = (event: any, selectedDate?: Date) => {
  setShowDuePicker(false); // Close picker
  if (selectedDate) {
    setDueDate(selectedDate.toISOString().split('T')[0]);
  }
};

  // -------------------- SCAN FUNCTIONS --------------------
  const handleScanBarcode = () => {
    Alert.alert('Scan Barcode', 'Camera functionality will be placed here.');
  };

  const handleUploadPhoto = () => {
    Alert.alert('Upload Photo', 'Image upload functionality will be placed here.');
  };

  // -------------------- ASSET ITEM --------------------

  const toggleAssetSelection = (asset: Asset) => {
    setSelectedAssets((prev) => {
      const isSelected = prev.find((a) => a.assetId === asset.assetId);
      if (isSelected) {
        return prev.filter((a) => a.assetId !== asset.assetId); // Remove if already selected
      } else {
        return [...prev, asset]; // Add if not selected
      }
    });
  };
  const renderAssetItem = ({ item }: { item: Asset }) => {
  const isSelected = selectedAssets.some((a) => a.assetId === item.assetId);

  return (
    <TouchableOpacity
      style={[
        styles.assetRow,
        isSelected && { backgroundColor: '#D0F0FD', borderColor: '#3B59B8', borderWidth: 1 },
      ]}
      onPress={() => toggleAssetSelection(item)}
    >
      <Ionicons
        name={isSelected ? "checkbox" : "square-outline"}
        size={24}
        color="#3B59B8"
      />
      <View style={{ marginLeft: 10 }}>
        <Text style={{ fontWeight: '600' }}>{item.assetName}</Text>
        {/* Show Serial Number or Barcode so they aren't identical */}
        <Text style={{ fontSize: 12, color: '#777' }}>
          S/N: {item.serialNumber || 'N/A'} | ID: {item.assetId}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
  if (loading) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading Assets...</Text>
      </View>
    );
  }

  // -------------------- MAIN UI --------------------
  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={10}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1A202C" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Assign Asset to Operator</Text>

            <View style={{ width: 40 }} />
          </View>

          {/* FORM */}
          <ScrollView contentContainerStyle={styles.formScrollContainer}>
            <View style={styles.formBody}>

              {/* LEFT COLUMN */}
              <View style={styles.formColumn}>

                {/* ASSET DROPDOWN */}
                <Text style={styles.label}>Selected Assets ({selectedAssets.length})</Text>
                <TouchableOpacity style={styles.pickerInput} onPress={() => setAssetModal(true)}>
                  <Text style={styles.pickerText}>
                    {selectedAssets.length > 0
                      ? selectedAssets.map(a => a.assetName).join(', ')
                      : 'Select Assets'}
                  </Text>
                  <Ionicons name="add-circle-outline" size={20} color="#333" />
                </TouchableOpacity>

                {/* OPERATOR DROPDOWN */}
                <Text style={styles.label}>Assign to Operator</Text>
                <TouchableOpacity
                  style={styles.pickerInput}
                  onPress={() => setOperatorModal(true)}
                >
                  <Text style={styles.pickerText}>{selectedOperator ? `${selectedOperator.fullName}
                   (${selectedOperator.employeeId})` : "Select Operator"}</Text>
                  <Ionicons name="chevron-down" size={20} color="#333" />
                </TouchableOpacity>

                {/* PROJECT */}
                <Text style={styles.label}>Project Name</Text>
                <View style={styles.inputGroup}>
                  <Feather name="briefcase" size={18} color="#555" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Highway Expansion Project"
                    value={projectName}
                    onChangeText={setProjectName}
                  />
                </View>

                {/* LOCATION */}
                <Text style={styles.label}>Destination / Site Location</Text>
                <View style={styles.inputGroup}>
                  <Feather name="map-pin" size={18} color="#555" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Downtown Site, Block A"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>

                {/* NOTES */}
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any relevant notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>

              {/* RIGHT COLUMN */}
              <View style={styles.formColumn}>
                <Text style={styles.label}>Scan Barcode</Text>

                <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode}>
                  <MaterialCommunityIcons name="barcode-scan" size={24} color="#fff" />
                  <Text style={styles.scanButtonText}>Scan Asset Barcode</Text>
                </TouchableOpacity>

                {/* ASSIGNED DATE */}
                <Text style={styles.label}>Assigned Date</Text>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    style={{
                      width: "100%",
                      height: 44,
                      padding: "10px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      fontSize: 14,
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.inputGroup}
                      onPress={() => setShowAssignedPicker(true)}
                    >
                      <Feather name="calendar" size={18} color="#555" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={assignedDate}
                        editable={false}
                        pointerEvents="none"
                      />
                    </TouchableOpacity>

                    {showAssignedPicker && (
                      <DateTimePicker
                        value={new Date(assignedDate)}
                        mode="date"
                        onChange={onAssignedChange}
                      />
                    )}
                  </>
                )}

                {/* EXPECTED RETURN DATE */}
                <Text style={styles.label}>Expected Return Date</Text>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={assignedDate}
                    style={{
                      width: "100%",
                      height: 44,
                      padding: "10px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      fontSize: 14,
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.inputGroup}
                      onPress={() => setShowDuePicker(true)}
                    >
                      <Feather name="calendar" size={18} color="#555" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={dueDate}
                        editable={false}
                        pointerEvents="none"
                      />
                    </TouchableOpacity>

                    {showDuePicker && (
                      <DateTimePicker
                        value={dueDate ? new Date(dueDate) : new Date()}
                        mode="date"
                        minimumDate={new Date()}
                        onChange={onDueChange}
                      />
                    )}
                  </>
                )}

                <Text style={styles.label}>Upload Photo (Optional)</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto}>
                  <Feather name="camera" size={20} color="#4A5568" />
                  <Text style={styles.uploadButtonText}>
                    {photo ? 'Photo Uploaded' : 'Tap to upload a photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAssign}>
              <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.assignButton}>
                <Text style={styles.buttonText}>Assign Asset</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ------------------- ASSET MODAL ------------------- */}
      <Modal visible={assetModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAssetModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Assets</Text>
            <FlatList
              data={assets}
              keyExtractor={(item, index) => `asset-${item.assetId}-${index}`}
              renderItem={renderAssetItem}
            />
            {/* Add a Close/Done button so the supervisor knows how to finish */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setAssetModal(false)}
            >
              <Text style={styles.doneButtonText}>Done ({selectedAssets.length})</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ------------------- OPERATOR MODAL ------------------- */}
      <Modal visible={operatorModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOperatorModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Operator</Text>

            {operators.map((op) => (
              <TouchableOpacity
                key={op.employeeId}
                style={styles.assetRow}
                onPress={() => {
                  setSelectedOperator(op); // store full object
                  setOperatorModal(false);
                }}
              >
                <Ionicons name="person-circle-outline" size={24} color="#4A55A2" />
                <Text style={{ marginLeft: 10, fontSize: 16 }}>
                  {op.fullName} ({op.employeeId})
                </Text>
              </TouchableOpacity>

            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
};

// -------------------- YOUR ORIGINAL STYLES (UNTOUCHED) --------------------
const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: { position: 'absolute', left: 20 },
  headerTitle: { color: '#1A202C', fontSize: 20, fontWeight: 'bold' },
  formScrollContainer: { padding: 25 },
  formBody: { flexDirection: 'row', gap: 25 },
  formColumn: { flex: 1 },
  label: {
    fontSize: 14,
    color: '#2D3748',
    marginBottom: 8,
    fontWeight: '600',
  },
  pickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  pickerText: { fontSize: 15, color: '#1A202C', fontWeight: '500' },
  inputGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#1A202C',
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    padding: 15,
    fontSize: 15,
    color: '#1A202C',
    height: 125,
    textAlignVertical: 'top',
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
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
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
  uploadButtonText: {
    color: '#4A5568',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 'auto',
  },
  assignButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginLeft: 15,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 10,
  },

  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1A202C',
  },
  doneButton: {
  backgroundColor: '#3B59B8',
  padding: 15,
  borderRadius: 10,
  alignItems: 'center',
  marginTop: 10
},
doneButtonText: {
  color: '#FFF',
  fontWeight: 'bold',
  fontSize: 16
},
modalContent: {
  backgroundColor: 'white',
  padding: 20,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: '80%', // Important so the list doesn't go off screen
},
});

export default AssignAssetScreen;