import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  Pressable,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Asset, baseURL, RootStackParamList } from '../../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import assignStyles from './assign.styles';
import { globalColors } from '../../styles/globalStyles';
import useAssetMeta from '../../hooks/useAssetMeta';
import AssetFiltersBar from 'src/components/common/AssetFiltersBar';

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
      editAsset?: Asset;
    };
  }>();

  const styles = assignStyles(isMobileLayout);
  // ⬅️ Supervisor details from CompanyLoginScreen
  const supervisor_employeeId = route.params?.supervisor_employeeId;
  const supervisorName = route.params?.supervisorName
  const editAsset = route.params?.editAsset;
  const isEditAssignmentMode = Boolean(editAsset?.assignmentId);

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
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('All Categories');

  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [assignedDate, setAssignedDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBatch, setPhotoBatch] = useState<string[]>([]);
  const [barcodeURL, setBarcodeURL] = useState<string | null>(null);
  const [assetPhotoMap, setAssetPhotoMap] = useState<Record<string, string>>({});
  const [assetPhotoBatchMap, setAssetPhotoBatchMap] = useState<Record<string, string[]>>({});
  const [assetBarcodeMap, setAssetBarcodeMap] = useState<Record<string, string>>({});
  const [assetPhotoLoadingMap, setAssetPhotoLoadingMap] = useState<Record<string, boolean>>({});
  const [assetBarcodeLoadingMap, setAssetBarcodeLoadingMap] = useState<Record<string, boolean>>({});
  const [photoLoading, setPhotoLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  const [showAssignedPicker, setShowAssignedPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const { categories } = useAssetMeta();
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    kind: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', kind: 'info' });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        if (isEditAssignmentMode && editAsset) {
          setSelectedAssets([editAsset]);
          setProjectName(String(editAsset.projectName || ''));
          setLocation(String(editAsset.location || ''));
          setAssignedDate(String(editAsset.assignedDate || today));
          setDueDate(String(editAsset.expectedReturnDate || ''));

          try {
            const assignmentResponse = await axios.get(`${baseURL}/api/assets/assign`, {
              params: {
                assignmentId: editAsset.assignmentId,
                assetId: editAsset.id || editAsset.assetId,
              },
            });

            const assignment = assignmentResponse.data || {};
            setProjectName(String(assignment.projectName || editAsset.projectName || ''));
            setLocation(String(assignment.location || editAsset.location || ''));
            setAssignedDate(String(assignment.assignedDate || editAsset.assignedDate || today));
            setDueDate(String(assignment.expectedReturnDate || editAsset.expectedReturnDate || ''));

            if (assignment.operatorEmployeeId) {
              const matchedOperator = assignableUsers.find(
                (op: any) => Number(op.employeeId) === Number(assignment.operatorEmployeeId),
              );
              if (matchedOperator) {
                setSelectedOperator(matchedOperator);
              }
            }
          } catch (assignmentError) {
            console.error('Failed to fetch assignment details:', assignmentError);
          }
        }
      } catch (err) {
        console.log(err);
        setError("Failed to fetch assets or users");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [baseURL, editAsset, isEditAssignmentMode, today]);

  // -------------------- ASSIGN HANDLER --------------------
  const isValidDateString = (value: string) => {
    if (!value) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  };

  const validateAssignmentForm = () => {
    const normalizedProjectName = projectName.trim();
    const normalizedLocation = location.trim();

    if (!isEditAssignmentMode) {
      if (selectedAssets.length === 0) {
        showSnackbar('Please select at least one asset.', 'error');
        return false;
      }

      if (!selectedOperator) {
        showSnackbar('Please select an assignee.', 'error');
        return false;
      }

      if (!selectedOperator?.employeeId) {
        showSnackbar('Selected assignee is invalid. Please select again.', 'error');
        return false;
      }
    }

    if (!normalizedProjectName) {
      showSnackbar('Project name is required.', 'error');
      return false;
    }

    if (!normalizedLocation) {
      showSnackbar('Destination / site location is required.', 'error');
      return false;
    }

    if (!assignedDate || !isValidDateString(assignedDate)) {
      showSnackbar('Please select a valid assigned date.', 'error');
      return false;
    }

    if (!dueDate || !isValidDateString(dueDate)) {
      showSnackbar('Please select a valid expected return date.', 'error');
      return false;
    }

    if (new Date(dueDate).getTime() < new Date(assignedDate).getTime()) {
      showSnackbar('Expected return date must be on or after assigned date.', 'error');
      return false;
    }

    if (!isEditAssignmentMode && selectedAssets.length > 1) {
      const missingMediaAssets = selectedAssets.filter((asset) => {
        const key = toAssetKey(asset.assetId);
        return !assetPhotoMap[key] || !assetBarcodeMap[key];
      });

      if (missingMediaAssets.length > 0) {
        showSnackbar('Please upload both photo and barcode for each selected asset.', 'error');
        return false;
      }
    }

    return true;
  };

  const handleAssign = async () => {
    if (!validateAssignmentForm()) {
      return;
    }

    try {
      if (isEditAssignmentMode && editAsset?.assignmentId) {
        await axios.put(`${baseURL}/api/assets/assign`, {
          assignmentId: editAsset.assignmentId,
          assetId: editAsset.id || editAsset.assetId,
          project_name: projectName.trim(),
          destination: location.trim(),
          assigned_date: assignedDate,
          expected_return_date: dueDate,
          notes: notes.trim(),
        });

        showSnackbar('Assigned asset updated!', 'success');
        navigation.goBack();
        return;
      }

      const selectedAssetIds = selectedAssets.map(a => toAssetId(a.assetId));
      const assetMedia = selectedAssetIds.map((assetId) => ({
        assetId,
        photoURL: assetPhotoMap[toAssetKey(assetId)] || photo || null,
        photoURLs:
          assetPhotoBatchMap[toAssetKey(assetId)] ||
          (assetPhotoMap[toAssetKey(assetId)] ? [assetPhotoMap[toAssetKey(assetId)]] : photoBatch),
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
        project_name: projectName.trim(),
        destination: location.trim(),
        assigned_date: assignedDate,
        expected_return_date: dueDate,
        notes: notes.trim(),
        assetMedia,
        ...(photo && { photoURL: photo }), // Include photo if available
        ...(photoBatch.length > 0 && { photoURLs: photoBatch }),
        ...(barcodeURL && { barcodeURL }),
      });

      showSnackbar(`${selectedAssets.length} Assets assigned!`, 'success');
      navigation.goBack();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to assign assets';
      console.error('Assign asset failed:', err?.response?.data || err);
      showSnackbar(errorMessage, 'error');
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

  const assetCategories = categories
    .map((item) => String(item?.category || '').trim())
    .filter(Boolean);

  const filteredAssets = useMemo(() => {
    const query = assetSearchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const category = String(asset.category || '').toLowerCase();
      const assetName = String(asset.assetName || '').toLowerCase();
      const modelNumber = String(asset.modelNumber || '').toLowerCase();
      const matchesCategory =
        assetCategoryFilter === 'All Categories' ||
        category.includes(assetCategoryFilter.toLowerCase()) ||
        assetName.includes(assetCategoryFilter.toLowerCase()) ||
        modelNumber.includes(assetCategoryFilter.toLowerCase());

      if (!matchesCategory) return false;

      if (!query) return true;

      const serialNumber = String(asset.serialNumber || '').toLowerCase();
      const assetId = String(asset.assetId || '').toLowerCase();

      return (
        category.includes(query) ||
        assetName.includes(query) ||
        modelNumber.includes(query) ||
        serialNumber.includes(query) ||
        assetId.includes(query)
      );
    });
  }, [assets, assetSearchQuery, assetCategoryFilter]);

  const pickImage = async (useCamera: boolean, isBarcode: boolean, targetAssetId?: number | string) => {
    const hasTargetAsset =
      targetAssetId !== undefined &&
      targetAssetId !== null &&
      !Number.isNaN(toAssetId(targetAssetId));
    const targetKey = hasTargetAsset ? toAssetKey(targetAssetId) : null;

    try {
      if (hasTargetAsset && targetKey) {
        if (isBarcode) setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
        else setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
      } else {
        if (isBarcode) setBarcodeLoading(true);
        else setPhotoLoading(true);
      }

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showSnackbar('Camera permission is required.', 'error');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showSnackbar('Media library permission is required.', 'error');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: useCamera ? Platform.OS === 'ios' : !isBarcode, // allow multi-select for photos in library
        allowsMultipleSelection: !useCamera && !isBarcode,
        aspect: isBarcode ? [4, 3] : undefined,
        quality: 0.2,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const photos: string[] = [];
        for (const asset of result.assets) {
          let base64 = asset.base64;
          if (!base64 && asset.uri) {
            try {
              base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: 'base64' as any,
              });
            } catch (err) {
              console.warn("Error reading file manually:", err);
            }
          }
          if (base64) {
            photos.push(`data:image/jpeg;base64,${base64}`);
          }
        }

        if (photos.length > 0) {
          const primaryPhoto = photos[0];
          if (isBarcode) {
            if (hasTargetAsset && targetKey) {
              setAssetBarcodeMap((prev) => ({ ...prev, [targetKey]: primaryPhoto }));
              showSnackbar('Barcode saved for selected asset.', 'success');
            } else {
              setBarcodeURL(primaryPhoto);
              showSnackbar('Barcode image will be attached to the assignment.', 'success');
            }
          } else {
            if (hasTargetAsset && targetKey) {
              setAssetPhotoMap((prev) => ({ ...prev, [targetKey]: primaryPhoto }));
              setAssetPhotoBatchMap((prev) => ({ ...prev, [targetKey]: photos }));
              showSnackbar('Photo saved for selected asset.', 'success');
            } else {
              setPhoto(primaryPhoto);
              setPhotoBatch(photos);
              showSnackbar('Photo will be attached to the assignment.', 'success');
            }
          }
        } else {
          showSnackbar('Failed to process image.', 'error');
        }
      }
    } catch (error) {
      console.error('Picker error:', error);
      showSnackbar('Failed to open camera or image library.', 'error');
    } finally {
      if (hasTargetAsset && targetKey) {
        if (isBarcode) setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
        else setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
      } else {
        if (isBarcode) setBarcodeLoading(false);
        else setPhotoLoading(false);
      }
    }
  };

  const handleUploadBarcode = (targetAssetId?: number | string) => {
    if (Platform.OS === 'web') {
      pickImage(false, true, targetAssetId);
    } else {
      Alert.alert(
        "Upload Barcode",
        "Choose an option",
        [
          { text: "Take Photo", onPress: () => pickImage(true, true, targetAssetId) },
          { text: "Choose from Gallery", onPress: () => pickImage(false, true, targetAssetId) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleUploadPhoto = (targetAssetId?: number | string) => {
    if (Platform.OS === 'web') {
      pickImage(false, false, targetAssetId);
    } else {
      Alert.alert(
        "Upload Photo",
        "Choose an option",
        [
          { text: "Take Photo", onPress: () => pickImage(true, false, targetAssetId) },
          { text: "Choose from Gallery", onPress: () => pickImage(false, false, targetAssetId) },
          { text: "Cancel", style: "cancel" }
        ]
      );
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
        setAssetPhotoBatchMap((current) => {
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
        isSelected && { backgroundColor: 'rgba(52, 211, 153, 0.16)', borderColor: '#34D399', borderWidth: 1 },
      ]}
      onPress={() => toggleAssetSelection(item)}
    >
      <Ionicons
        name={isSelected ? "checkbox" : "square-outline"}
        size={24}
        color="#34D399"
      />
      <View style={{ marginLeft: 10 }}>
        <Text style={{ fontWeight: '600', color: '#E6F3FF' }}>{item.assetName}</Text>
        {/* Show Serial Number or Barcode so they aren't identical */}
        <Text style={{ fontSize: 12, color: '#A9C6E4' }}>
          S/N: {item.serialNumber || 'N/A'} | ID: {item.assetId}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
  if (loading) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color={globalColors.surfacePrimary} />
        <Text style={{ color: globalColors.surfacePrimary, marginTop: 10 }}>Loading Assets...</Text>
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
        <View style={[styles.container, isMobileLayout && { margin: 0, borderRadius: 0, backgroundColor: 'rgba(7, 24, 42, 0.92)' }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#E6F3FF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{isEditAssignmentMode ? 'Edit Assigned Asset' : 'Assign Asset'}</Text>

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
                <TouchableOpacity
                  style={styles.pickerInput}
                  onPress={() => {
                    if (!isEditAssignmentMode) setAssetModal(true);
                  }}
                >
                  <Text style={[styles.pickerText, { color: '#E6F3FF' }]}>
                    {selectedAssets.length > 0
                      ? selectedAssets.map(a => a.assetName).join(', ')
                      : 'Select Assets'}
                  </Text>
                  {!isEditAssignmentMode && (
                    <Ionicons name="add-circle-outline" size={20} color="#A9C6E4" />
                  )}
                </TouchableOpacity>

                {/* OPERATOR DROPDOWN */}
                <Text style={styles.label}>
                  {canAssignToSupervisor ? 'Assign to Employee' : 'Assign to Operator'}
                </Text>
                <TouchableOpacity
                  style={styles.pickerInput}
                  onPress={() => {
                    if (!isEditAssignmentMode) setOperatorModal(true);
                  }}
                >
                  <Text style={styles.pickerText}>{selectedOperator ? `${selectedOperator.fullName}
                   (${selectedOperator.employeeId})` : (canAssignToSupervisor ? 'Select Employee' : 'Select Operator')}</Text>
                  {!isEditAssignmentMode && (
                    <Ionicons name="chevron-down" size={20} color="#A9C6E4" />
                  )}
                </TouchableOpacity>

                {/* PROJECT */}
                <Text style={styles.label}>Project Name</Text>
                <View style={styles.inputGroup}>
                  <Feather name="briefcase" size={18} color="#A9C6E4" style={styles.inputIcon} />
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
                  <Feather name="map-pin" size={18} color="#A9C6E4" style={styles.inputIcon} />
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
                      border: "1px solid rgba(159, 207, 255, 0.22)",
                      fontSize: 14,
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.inputGroup}
                      onPress={() => setShowAssignedPicker(true)}
                    >
                      <Feather name="calendar" size={18} color="#A9C6E4" style={styles.inputIcon} />
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
                      border: "1px solid rgba(159, 207, 255, 0.22)",
                      fontSize: 14,
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.inputGroup}
                      onPress={() => setShowDuePicker(true)}
                    >
                      <Feather name="calendar" size={18} color="#A9C6E4" style={styles.inputIcon} />
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
                            onPress={() => handleUploadBarcode(asset.assetId)}
                            disabled={isBarcodeLoading}
                          >
                            {isBarcodeLoading ? (
                              <ActivityIndicator color="#A9C6E4" size="small" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="barcode" size={20} color="#A9C6E4" />
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

                    <Text style={styles.label}>Upload Barcode </Text>
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

          {/* FOOTER */}
          <View style={[
          styles.footer, 
          isMobileLayout && { justifyContent: 'center', paddingBottom: 30 }
        ]}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={[styles.buttonText, { color: '#A9C6E4' }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAssign}>
              <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.assignButton}>
                <Text style={styles.buttonText}>{isEditAssignmentMode ? 'Save Changes' : 'Assign Asset'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ------------------- ASSET MODAL ------------------- */}
      <Modal visible={assetModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setAssetModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Assets</Text>

            <AssetFiltersBar
              isMobileLayout={isMobileLayout}
              searchValue={assetSearchQuery}
              onSearchChange={setAssetSearchQuery}
              searchPlaceholder="Search by name, serial no, or ID"
              showCategory
              categoryValue={assetCategoryFilter === 'All Categories' ? '' : assetCategoryFilter}
              onCategoryChange={(value) =>
                setAssetCategoryFilter(value ? value : 'All Categories')
              }
              categoryOptions={assetCategories.filter((category) => category !== 'All Categories')}
              categoryAllLabel="All Categories"
              containerStyle={{ marginBottom: 12 }}
              searchContainerStyle={{
                backgroundColor: 'rgba(18, 45, 73, 0.86)',
                borderColor: 'rgba(159, 207, 255, 0.22)',
                minHeight: 42,
              }}
              searchInputStyle={{
                color: '#E6F3FF',
              }}
              pickerWrapperStyle={{
                marginBottom: 0,
                minHeight: 42,
                backgroundColor: 'rgba(18, 45, 73, 0.86)',
                borderColor: 'rgba(159, 207, 255, 0.22)',
              }}
              pickerStyle={{
                fontSize: 14,
                color: '#E6F3FF',
                backgroundColor: 'rgba(18, 45, 73, 0.86)',
              }}
              pickerItemColor="#0F172A"
            />

            <FlatList
              data={filteredAssets}
              keyExtractor={(item, index) => `asset-${item.assetId}-${index}`}
              renderItem={renderAssetItem}
              ListEmptyComponent={
                <Text style={styles.helperText}>No assets found for this search.</Text>
              }
            />
            {/* Add a Close/Done button so the supervisor knows how to finish */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setAssetModal(false)}
            >
              <Text style={styles.doneButtonText}>Done ({selectedAssets.length})</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
                <Ionicons name="person-circle-outline" size={24} color="#22D3EE" />
                <Text style={{ marginLeft: 10, fontSize: 16, color: '#E6F3FF' }}>
                  {op.fullName} ({op.employeeId})
                </Text>
              </TouchableOpacity>

            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {snackbar.visible && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: isMobileLayout ? 16 : 22,
            zIndex: 1100,
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
                  ? 'rgba(6, 78, 59, 0.96)'
                  : snackbar.kind === 'error'
                    ? 'rgba(127, 29, 29, 0.96)'
                    : 'rgba(15, 23, 42, 0.96)',
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
    </ImageBackground>
  );
};


export default AssignAssetScreen;