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
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Asset, baseURL, RootStackParamList } from '../../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import assignStyles from './assign.styles';

type AssignAssetNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AssignAsset'
>;

const AssignAssetScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const navigation = useNavigation<AssignAssetNavigationProp>();
  const route = useRoute<{
    key: string;
    name: string;
    params: {
      supervisor_employeeId: string;
      supervisorName: string;
    };
  }>();

  const styles = assignStyles(isMobileLayout);
  // ⬅️ Supervisor details from CompanyLoginScreen
  const supervisor_employeeId = route.params?.supervisor_employeeId;
  const supervisorName = route.params?.supervisorName

  const today = new Date().toISOString().split('T')[0];

  // -------------------- STATES --------------------
  const [assets, setAssets] = useState<Asset[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [canAssignToSupervisor, setCanAssignToSupervisor] = useState(false);
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
  const [barcodeURL, setBarcodeURL] = useState<string | null>(null);
  const [assetPhotoMap, setAssetPhotoMap] = useState<Record<string, string>>({});
  const [assetBarcodeMap, setAssetBarcodeMap] = useState<Record<string, string>>({});
  const [assetPhotoLoadingMap, setAssetPhotoLoadingMap] = useState<Record<string, boolean>>({});
  const [assetBarcodeLoadingMap, setAssetBarcodeLoadingMap] = useState<Record<string, boolean>>({});
  const [photoLoading, setPhotoLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  const [showAssignedPicker, setShowAssignedPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  // -------------------- FETCH ASSETS --------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const storedUser = await AsyncStorage.getItem('user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const assignerRole = String(
          parsedUser?.roleName || parsedUser?.role?.roleName || '',
        ).toLowerCase();
        const privilegedRoles = [
          'admin',
          'super',
          'superadmin',
          'super admin',
        ];
        const isPrivilegedAssigner = privilegedRoles.includes(assignerRole);
        setCanAssignToSupervisor(isPrivilegedAssigner);

        // ----- FETCH ASSETS -----
        const res = await axios.get(`${baseURL}/api/assets`);

        const rawData = res.data.assets || res.data || [];
        const normalizedAssets = rawData.map((a: any) => ({
          ...a,
          assetId: Number(a.assetId || a.id),
        }));

        const unassignedAssets = normalizedAssets.filter(
          (a: any) => a.status?.toLowerCase() === 'unassigned'
        );

        // 🔥 REMOVE DUPLICATES BY assetId
        const uniqueAssets = Array.from(
          new Map(unassignedAssets.map((a: any) => [a.assetId, a])).values()
        ) as Asset[];

        setAssets(uniqueAssets);
        // ----- FETCH OPERATORS -----
        const response = await axios.get(`${baseURL}/api/auth/users`);

        const rawUsers = response.data.users || response.data.data || response.data || [];

        const assignableUsers = rawUsers.filter((u: any) => {
          const targetRole = String(
            u.role?.roleName || u.roleName || '',
          ).toLowerCase();

          if (isPrivilegedAssigner) {
            return targetRole === 'operator' || targetRole === 'supervisor';
          }

          return targetRole === 'operator';
        });

        setOperators(assignableUsers);
      } catch (err) {
        console.log(err);
        setError("Failed to fetch assets or users");
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
      Alert.alert('Error', 'Please select assignee');
      return;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Please select expected return date');
      return;
    }

    if (selectedAssets.length > 1) {
      console.log('🔍 Validating multi-select media...');
      console.log('assetPhotoMap:', assetPhotoMap);
      console.log('assetBarcodeMap:', assetBarcodeMap);
      
      const missingMediaAssets = selectedAssets.filter(
        (asset) => {
          const key = toAssetKey(asset.assetId);
          const hasPhoto = !!assetPhotoMap[key];
          const hasBarcode = !!assetBarcodeMap[key];
          console.log(`Asset ${key}: photo=${hasPhoto}, barcode=${hasBarcode}`);
          return !hasPhoto || !hasBarcode;
        }
      );

      if (missingMediaAssets.length > 0) {
        console.log('❌ Missing media for:', missingMediaAssets.map(a => toAssetKey(a.assetId)));
        Alert.alert(
          'Media Required',
          'Please upload both photo and barcode for each selected asset.'
        );
        return;
      }
      console.log('✅ All media present for multi-select');
    }

    try {
      const selectedAssetIds = selectedAssets.map(a => toAssetId(a.assetId));
      const assetMedia = selectedAssetIds.map((assetId) => ({
        assetId,
        photoURL: assetPhotoMap[toAssetKey(assetId)] || photo || null,
        barcodeURL: assetBarcodeMap[toAssetKey(assetId)] || barcodeURL || null,
      }));

      console.log('🔍 Assignment Payload:');
      console.log('selectedAssetIds:', selectedAssetIds);
      console.log('assetMedia:', assetMedia.map(m => ({
        assetId: m.assetId,
        hasPhoto: !!m.photoURL,
        hasBarcode: !!m.barcodeURL
      })));

      // 🔥 Send the array of IDs to your bulk assignment API
      await axios.post(`${baseURL}/api/assets/assign`, {
        assetIds: selectedAssetIds,
        operator_employeeId: selectedOperator.employeeId,
        supervisor_employeeId: supervisor_employeeId,
        project_name: projectName,
        destination: location,
        assigned_date: assignedDate,
        expected_return_date: dueDate,
        notes,
        assetMedia,
        ...(photo && { photoURL: photo }), // Include photo if available
        ...(barcodeURL && { barcodeURL }),
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

  const toAssetId = (value: unknown) => Number(value);
  const toAssetKey = (value: unknown) => String(toAssetId(value));

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
        Alert.alert('Permission Denied', 'Media library permission is required to upload barcode image.');
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
            setAssetBarcodeMap((prev) => {
              const updated = { ...prev, [targetKey]: barcodeData };
              console.log('🔍 Barcode uploaded for asset:', targetKey, '| Map:', updated);
              return updated;
            });
            Alert.alert('✅ Barcode Selected', 'Barcode saved for selected asset.');
          } else {
            setBarcodeURL(barcodeData);
            Alert.alert('✅ Barcode Selected', 'Barcode image will be attached to the assignment.');
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
            setAssetPhotoMap((prev) => {
              const updated = { ...prev, [targetKey]: photoURL };
              console.log('🔍 Photo uploaded for asset:', targetKey, '| Map:', updated);
              return updated;
            });
            Alert.alert('✅ Photo Selected', 'Photo saved for selected asset.');
          } else {
            setPhoto(photoURL);
            Alert.alert('✅ Photo Selected', 'Photo will be attached to the assignment.');
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

  // -------------------- ASSET ITEM --------------------

  const toggleAssetSelection = (asset: Asset) => {
    setSelectedAssets((prev) => {
      const isSelected = prev.find((a) => a.assetId === asset.assetId);
      if (isSelected) {
        const assetKey = toAssetKey(asset.assetId);
        setAssetPhotoMap((current) => {
          const next = { ...current };
          delete next[assetKey];
          return next;
        });
        setAssetBarcodeMap((current) => {
          const next = { ...current };
          delete next[assetKey];
          return next;
        });
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
        <View style={[styles.container, isMobileLayout && { margin: 0, borderRadius: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1A202C" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Assign Asset</Text>

            <View style={{ width: 40 }} />
          </View>

          {/* FORM */}
          <ScrollView 
          contentContainerStyle={[
            styles.formScrollContainer,
            isMobileLayout && { paddingHorizontal: 15 } // Tighter padding for phones
          ]}
          showsVerticalScrollIndicator={false}
        >
            {/* TOGGLE COLUMN FOR MOBILE: 
             'row' for Web, 'column' for Mobile 
          */}
          <View style={[
            styles.formBody, 
            { flexDirection: isMobileLayout ? 'column' : 'row', gap: isMobileLayout ? 0 : 25 }
          ]}>

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
                <Text style={styles.label}>
                  {canAssignToSupervisor ? 'Assign to Employee' : 'Assign to Operator'}
                </Text>
                <TouchableOpacity
                  style={styles.pickerInput}
                  onPress={() => setOperatorModal(true)}
                >
                  <Text style={styles.pickerText}>{selectedOperator ? `${selectedOperator.fullName}
                   (${selectedOperator.employeeId})` : (canAssignToSupervisor ? 'Select Employee' : 'Select Operator')}</Text>
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
              <View style={[styles.formColumn, isMobileLayout && { marginTop: 10 }]}> 

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

                {selectedAssets.length > 1 ? (
                  <>
                    <Text style={styles.label}>Upload Per Asset (Required for Multi-Select)</Text>
                    <Text style={styles.helperText}>Each selected asset needs both a photo and barcode image.</Text>
                    {selectedAssets.map((asset) => {
                      const assetKey = toAssetKey(asset.assetId);
                      const currentPhoto = assetPhotoMap[assetKey] || null;
                      const currentBarcode = assetBarcodeMap[assetKey] || null;
                      const isPhotoLoading = assetPhotoLoadingMap[assetKey] || false;
                      const isBarcodeLoading = assetBarcodeLoadingMap[assetKey] || false;
                      return (
                        <View key={`media-${asset.assetId}`} style={styles.mediaCard}>
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
                            onPress={() => handleUploadBarcode(asset.assetId)}
                            disabled={isBarcodeLoading}
                          >
                            {isBarcodeLoading ? (
                              <ActivityIndicator color="#4A5568" size="small" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="barcode" size={20} color="#4A5568" />
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
                    <Text style={styles.label}>Upload Photo</Text>
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

                    <Text style={styles.label}>Upload Barcode </Text>
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

          {/* FOOTER */}
          <View style={[
          styles.footer, 
          isMobileLayout && { justifyContent: 'center', paddingBottom: 30 }
        ]}>
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
            <Text style={styles.modalTitle}>
              {canAssignToSupervisor ? 'Select Employee' : 'Select Operator'}
            </Text>

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


export default AssignAssetScreen;