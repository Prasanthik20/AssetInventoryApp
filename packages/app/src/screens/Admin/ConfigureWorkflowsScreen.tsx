import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Platform,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { baseURL } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

interface WorkflowStep {
  stepId?: string;
  stepSequence: number;
  approverRoleId: string;
  approverRoleName?: string;
}

interface Workflow {
  workflowId?: string;
  name: string;
  actionType: 'CHECKOUT' | 'RETURN';
  isActive: boolean;
  steps: WorkflowStep[];
}

interface Role {
  roleId: string;
  roleName: string;
}

export default function ConfigureWorkflowsScreen() {
  const navigation = useNavigation<any>();
  const isWeb = Platform.OS === 'web';

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Active configurations state
  const [selectedType, setSelectedType] = useState<'CHECKOUT' | 'RETURN'>('CHECKOUT');
  const [currentSteps, setCurrentSteps] = useState<WorkflowStep[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      // 1. Fetch roles
      const rolesRes = await axios.get(`${baseURL}/api/approvals/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. Fetch workflows
      const workflowsRes = await axios.get(`${baseURL}/api/approvals/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (rolesRes.data) {
        setRoles(rolesRes.data.roles || []);
      }

      if (workflowsRes.data) {
        const list = workflowsRes.data.workflows || [];
        setWorkflows(list);
        loadWorkflowType(list, selectedType);
      }
    } catch (error: any) {
      console.error('Fetch workflows screen error:', error);
      Alert.alert('Error', 'Failed to fetch workflow configurations.');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowType = (list: Workflow[], type: 'CHECKOUT' | 'RETURN') => {
    const matched = list.find(w => w.actionType === type);
    if (matched) {
      setCurrentSteps(matched.steps || []);
      setIsActive(matched.isActive);
      setName(matched.name);
    } else {
      setCurrentSteps([]);
      setIsActive(false);
      setName(`${type === 'CHECKOUT' ? 'Checkout' : 'Return'} Approval Workflow`);
    }
  };

  const handleTypeChange = (type: 'CHECKOUT' | 'RETURN') => {
    setSelectedType(type);
    loadWorkflowType(workflows, type);
  };

  const handleAddStep = () => {
    if (roles.length === 0) {
      Alert.alert('Configuration Error', 'Please create custom roles first.');
      return;
    }
    const nextSeq = currentSteps.length + 1;
    setCurrentSteps(prev => [
      ...prev,
      {
        stepSequence: nextSeq,
        approverRoleId: roles[0].roleId,
        approverRoleName: roles[0].roleName
      }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setCurrentSteps(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      // Re-index sequences
      return filtered.map((step, idx) => ({
        ...step,
        stepSequence: idx + 1
      }));
    });
  };

  const handleStepRoleChange = (index: number, roleId: string) => {
    const roleObj = roles.find(r => r.roleId === roleId);
    setCurrentSteps(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        approverRoleId: roleId,
        approverRoleName: roleObj ? roleObj.roleName : ''
      };
      return updated;
    });
  };

  const handleSaveWorkflow = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Workflow Name is required.');
      return;
    }

    if (isActive && currentSteps.length === 0) {
      Alert.alert('Validation Error', 'An active workflow must have at least one approval step.');
      return;
    }

    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('token');

      await axios.post(`${baseURL}/api/approvals/workflows`, {
        name: name.trim(),
        actionType: selectedType,
        isActive,
        steps: currentSteps.map(s => ({
          stepSequence: s.stepSequence,
          approverRoleId: s.approverRoleId
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Workflow configuration saved successfully.');
      
      // Reload configurations
      const workflowsRes = await axios.get(`${baseURL}/api/approvals/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (workflowsRes.data) {
        setWorkflows(workflowsRes.data.workflows || []);
      }
    } catch (error: any) {
      console.error('Save workflow config error:', error?.response?.data || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save workflow.');
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
        <Text style={styles.loadingText}>Loading Configurations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back-outline" size={24} color="#A9C6E4" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Approval Workflows</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Workflow Tabs selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedType === 'CHECKOUT' && styles.activeTab]}
              onPress={() => handleTypeChange('CHECKOUT')}
            >
              <Text style={[styles.tabText, selectedType === 'CHECKOUT' && styles.activeTabText]}>
                Checkout Workflow
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedType === 'RETURN' && styles.activeTab]}
              onPress={() => handleTypeChange('RETURN')}
            >
              <Text style={[styles.tabText, selectedType === 'RETURN' && styles.activeTabText]}>
                Return Workflow
              </Text>
            </TouchableOpacity>
          </View>

          {/* Settings Box */}
          <View style={styles.settingsCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Workflow Status</Text>
              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, isActive ? { color: '#22D3EE' } : { color: '#7FA2C8' }]}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#1E293B', true: '#0F766E' }}
                  thumbColor={isActive ? '#22D3EE' : '#94A3B8'}
                />
              </View>
            </View>

            <Text style={styles.infoText}>
              {isActive
                ? `Transactions of type ${selectedType} will automatically run through these approvals.`
                : `Transactions of type ${selectedType} will bypass approvals and execute immediately.`}
            </Text>
          </View>

          {/* Steps Sequence Section */}
          <View style={styles.stepsSection}>
            <View style={styles.stepsHeader}>
              <Text style={styles.sectionTitle}>Approval Sequence Levels</Text>
              <TouchableOpacity onPress={handleAddStep} style={styles.addStepBtn}>
                <Ionicons name="add-outline" size={18} color="#22D3EE" />
                <Text style={styles.addStepBtnText}>Add Level</Text>
              </TouchableOpacity>
            </View>

            {currentSteps.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="git-compare-outline" size={32} color="#7FA2C8" />
                <Text style={styles.emptyStateText}>No approval levels configured.</Text>
              </View>
            ) : (
              currentSteps.map((step, index) => (
                <View key={index} style={styles.stepCard}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>L{step.stepSequence}</Text>
                  </View>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={step.approverRoleId}
                      onValueChange={(itemValue) => handleStepRoleChange(index, itemValue)}
                      style={styles.picker}
                      dropdownIconColor="#22D3EE"
                    >
                      {roles.map((r) => (
                        <Picker.Item
                          key={r.roleId}
                          label={`Approver: ${r.roleName}`}
                          value={r.roleId}
                          color={Platform.OS === 'web' ? '#F8FAFC' : '#E6F3FF'}
                          style={{ backgroundColor: '#0F172A', color: '#F8FAFC' }}
                        />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveStep(index)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Save Control */}
          <TouchableOpacity
            style={[styles.saveBtn, actionLoading && { opacity: 0.7 }]}
            onPress={handleSaveWorkflow}
            disabled={actionLoading}
          >
            <Text style={styles.saveBtnText}>
              {actionLoading ? 'SAVING WORKFLOW...' : 'SAVE WORKFLOW CONFIGURATION'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071425' },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#071425', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#E6F3FF', marginTop: 10, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  backButton: { padding: 5 },
  headerTitle: { color: '#E6F3FF', fontSize: 20, fontWeight: 'bold' },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(18, 45, 73, 0.6)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'rgba(34, 211, 238, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)' },
  tabText: { color: '#7FA2C8', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#22D3EE' },

  // Settings Card
  settingsCard: {
    backgroundColor: 'rgba(18, 45, 73, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.15)'
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#E6F3FF', fontSize: 16, fontWeight: '600' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 12, fontWeight: 'bold' },
  infoText: { color: '#7FA2C8', fontSize: 13, marginTop: 10, lineHeight: 18 },

  // Steps
  stepsSection: { marginBottom: 30 },
  stepsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#E6F3FF', fontSize: 16, fontWeight: 'bold' },
  addStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34, 211, 238, 0.12)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)' },
  addStepBtnText: { color: '#22D3EE', fontSize: 13, fontWeight: 'bold' },

  emptyState: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(18, 45, 73, 0.4)', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(159, 207, 255, 0.2)' },
  emptyStateText: { color: '#7FA2C8', fontSize: 14, marginTop: 10 },

  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 45, 73, 0.85)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.12)'
  },
  stepBadge: {
    backgroundColor: '#22D3EE',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  stepBadgeText: { color: '#071425', fontSize: 13, fontWeight: 'bold' },
  pickerContainer: { flex: 1, backgroundColor: '#0F172A', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)', marginRight: 10, overflow: 'hidden' },
  picker: { color: '#F8FAFC', backgroundColor: '#0F172A', height: 44, width: '100%', paddingHorizontal: 10, fontWeight: '600', outlineStyle: 'none' as any, cursor: 'pointer' as any },
  removeBtn: { padding: 10 },

  saveBtn: { backgroundColor: '#22D3EE', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#071425', fontSize: 15, fontWeight: 'bold' }
});
