import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { baseURL } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Permission {
  id: number;
  code: string;
  name: string;
}

interface Role {
  roleId: string;
  roleName: string;
  isSystem: boolean;
  permissions: { code: string; name: string }[];
}

export default function ManageRolesScreen() {
  const navigation = useNavigation<any>();
  const isWeb = Platform.OS === 'web';

  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${baseURL}/api/approvals/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setRoles(response.data.roles || []);
        setAvailablePermissions(response.data.availablePermissions || []);
      }
    } catch (error: any) {
      console.error('Fetch roles screen error:', error);
      Alert.alert('Error', 'Failed to fetch roles list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedRole(null);
    setNewRoleName('');
    setSelectedPermissions([]);
    setIsEditing(false);
    setRoleModalVisible(true);
  };

  const handleOpenEdit = (role: Role) => {
    if (role.isSystem) {
      Alert.alert('System Role', 'System-default roles are read-only to ensure baseline application logic.');
      return;
    }
    setSelectedRole(role);
    setNewRoleName(role.roleName);
    setSelectedPermissions(role.permissions.map(p => p.code));
    setIsEditing(true);
    setRoleModalVisible(true);
  };

  const togglePermission = (code: string) => {
    setSelectedPermissions(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSaveRole = async () => {
    if (!newRoleName.trim()) {
      Alert.alert('Validation Error', 'Role Name is required.');
      return;
    }

    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('token');

      if (isEditing && selectedRole) {
        await axios.put(`${baseURL}/api/approvals/roles`, {
          roleId: selectedRole.roleId,
          roleName: newRoleName.trim(),
          permissionCodes: selectedPermissions
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Success', 'Role updated successfully.');
      } else {
        await axios.post(`${baseURL}/api/approvals/roles`, {
          roleName: newRoleName.trim(),
          permissionCodes: selectedPermissions
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Success', 'Role created successfully.');
      }
      setRoleModalVisible(false);
      fetchRolesAndPermissions();
    } catch (error: any) {
      console.error('Save role error:', error?.response?.data || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save role configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CompanyDashboard');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22D3EE" />
        <Text style={styles.loadingText}>Loading Roles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#A9C6E4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Role Management</Text>
          <TouchableOpacity onPress={handleOpenCreate} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={24} color="#22D3EE" />
            <Text style={styles.addButtonText}>Add Custom Role</Text>
          </TouchableOpacity>
        </View>

        {/* Roles List */}
        <FlatList
          data={roles}
          keyExtractor={(item) => item.roleId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.roleCard}>
              <View style={styles.roleHeader}>
                <View>
                  <Text style={styles.roleNameText}>{item.roleName}</Text>
                  <Text style={styles.roleTypeTag}>
                    {item.isSystem ? 'System Default' : 'Custom Tenant Role'}
                  </Text>
                </View>
                {!item.isSystem && (
                  <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.editIcon}>
                    <Ionicons name="create-outline" size={20} color="#22D3EE" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.sectionSubTitle}>Assigned Permissions:</Text>
              <View style={styles.permissionBadgeContainer}>
                {item.permissions.length === 0 ? (
                  <Text style={styles.noPermissionsText}>No permissions mapped.</Text>
                ) : (
                  item.permissions.map(p => (
                    <View key={p.code} style={styles.permissionBadge}>
                      <Text style={styles.permissionBadgeText}>{p.name}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        />
      </View>

      {/* Save/Edit Modal */}
      <Modal
        visible={roleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isWeb && styles.webModalWidth]}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Modify Custom Role' : 'Create Custom Role'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Role Name (e.g., Inventory Manager)"
              placeholderTextColor="#7FA2C8"
              value={newRoleName}
              onChangeText={setNewRoleName}
            />

            <Text style={styles.permissionsLabel}>Configure Permissions Matrix:</Text>

            <ScrollView style={styles.permissionsScroll}>
              {availablePermissions.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.code);
                return (
                  <TouchableOpacity
                    key={perm.id}
                    style={styles.checkboxRow}
                    onPress={() => togglePermission(perm.code)}
                  >
                    <View style={styles.checkboxOuter}>
                      {isChecked && <View style={styles.checkboxInner} />}
                    </View>
                    <View style={styles.checkboxTextContainer}>
                      <Text style={styles.checkboxName}>{perm.name}</Text>
                      <Text style={styles.checkboxCode}>{perm.code}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                onPress={handleSaveRole}
                disabled={actionLoading}
                style={[styles.saveBtn, actionLoading && { opacity: 0.7 }]}
              >
                <Text style={styles.saveBtnText}>{actionLoading ? 'SAVING...' : 'SAVE ROLE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRoleModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071425' },
  container: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#071425', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#E6F3FF', marginTop: 10, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 5 },
  headerTitle: { color: '#E6F3FF', fontSize: 20, fontWeight: 'bold' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addButtonText: { color: '#22D3EE', fontWeight: 'bold' },
  listContent: { gap: 15, paddingBottom: 30 },
  roleCard: {
    backgroundColor: 'rgba(18, 45, 73, 0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.15)'
  },
  roleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  roleNameText: { color: '#E6F3FF', fontSize: 18, fontWeight: 'bold' },
  roleTypeTag: { color: '#7FA2C8', fontSize: 12, marginTop: 2 },
  editIcon: { padding: 5 },
  sectionSubTitle: { color: '#A9C6E4', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  permissionBadgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  permissionBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)'
  },
  permissionBadgeText: { color: '#22D3EE', fontSize: 12 },
  noPermissionsText: { color: '#7FA2C8', fontSize: 13, fontStyle: 'italic' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: {
    backgroundColor: '#071425',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.2)'
  },
  webModalWidth: { maxWidth: 500 },
  modalTitle: { color: '#E6F3FF', fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.2)',
    color: '#E6F3FF',
  },
  permissionsLabel: { color: '#A9C6E4', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  permissionsScroll: { maxHeight: 300, marginBottom: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(159, 207, 255, 0.08)' },
  checkboxOuter: { height: 20, width: 20, borderRadius: 6, borderWidth: 2, borderColor: '#22D3EE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxInner: { height: 10, width: 10, borderRadius: 3, backgroundColor: '#22D3EE' },
  checkboxTextContainer: { flex: 1 },
  checkboxName: { color: '#E6F3FF', fontSize: 14, fontWeight: '500' },
  checkboxCode: { color: '#7FA2C8', fontSize: 11, marginTop: 1 },

  modalActionButtons: { flexDirection: 'row', gap: 15, marginTop: 10 },
  saveBtn: { flex: 1, backgroundColor: '#22D3EE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#071425', fontSize: 15, fontWeight: 'bold' },
  cancelBtn: { flex: 1, backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#7FA2C8' },
  cancelBtnText: { color: '#7FA2C8', fontSize: 15, fontWeight: 'bold' }
});
