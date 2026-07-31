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
  ImageBackground,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { baseURL } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppSnackbar from '../../components/common/AppSnackbar';

interface Category {
  id: string;
  categoryId: string;
  category: string;
  isCustom: boolean;
  isSystemCategory: boolean;
}

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
}

export default function CustomCategoryBuilder() {
  const navigation = useNavigation<any>();
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    kind: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', kind: 'info' });

  const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({ visible: true, message, kind });
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CompanyDashboard' as any);
    }
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category State
  const [newCatModalVisible, setNewCatModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fields State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text'); // text, date, number

  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  useEffect(() => {
    fetchCategories();
    const checkSubscription = async () => {
      const expired = await AsyncStorage.getItem('isSubscriptionExpired');
      if (expired) {
        setIsSubscriptionExpired(JSON.parse(expired));
      }
    };
    checkSubscription();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseURL}/api/categories`);
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showSnackbar('Error fetching categories.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showSnackbar('Category name is required.', 'error');
      return;
    }
    try {
      await axios.post(`${baseURL}/api/categories`, {
        categoryName: newCategoryName,
      });
      setNewCategoryName('');
      setNewCatModalVisible(false);
      fetchCategories();
      showSnackbar('Category created successfully.', 'success');
    } catch (error) {
      console.error('Error creating category:', error);
      showSnackbar('Failed to create category.', 'error');
    }
  };

  const fetchFields = async (category: Category) => {
    setSelectedCategory(category);
    try {
      setFieldsLoading(true);
      const res = await axios.get(`${baseURL}/api/categories/${category.categoryId}/fields`);
      setFields(res.data.fields || []);
    } catch (error) {
      console.error('Error fetching fields:', error);
      showSnackbar('Error fetching fields.', 'error');
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!selectedCategory) return;
    if (!newFieldName.trim()) {
      showSnackbar('Field name is required.', 'error');
      return;
    }
    try {
      await axios.post(`${baseURL}/api/categories/${selectedCategory.categoryId}/fields`, {
        fieldName: newFieldName,
        fieldType: newFieldType,
        isRequired: false,
      });
      setNewFieldName('');
      fetchFields(selectedCategory);
      showSnackbar('Custom field added successfully.', 'success');
    } catch (error) {
      console.error('Error adding field:', error);
      showSnackbar('Failed to add custom field.', 'error');
    }
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory?.id === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => fetchFields(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="folder-open-outline" size={22} color={isSelected ? "#8B5CF6" : "#38BDF8"} />
          <View style={styles.badgeContainer}>
            {item.isSystemCategory && <Text style={styles.systemBadge}>System</Text>}
            {item.isCustom && <Text style={styles.customBadge}>Custom</Text>}
          </View>
        </View>
        <Text style={[styles.categoryName, isSelected && styles.selectedCategoryName]}>{item.category}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
              </TouchableOpacity>
              <Text style={styles.title}>Asset Categories</Text>
            </View>

            {!isSubscriptionExpired && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setNewCatModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>New Category</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Layout Columns */}
          <View style={styles.layout}>
            {/* Left Column: Categories List */}
            <View style={styles.leftColumn}>
              <Text style={styles.columnHeader}>Categories</Text>
              {loading ? (
                <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 20 }} />
              ) : (
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderCategory}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>

            {/* Right Column: Dynamic Fields Builder */}
            <View style={styles.rightColumn}>
              {selectedCategory ? (
                <View style={styles.fieldsContainer}>
                  <Text style={styles.fieldsTitle}>
                    Fields for <Text style={{ color: '#8B5CF6' }}>{selectedCategory.category}</Text>
                  </Text>

                  <View style={styles.addFieldContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Field Name (e.g. Calibration Date)"
                      placeholderTextColor="#64748B"
                      value={newFieldName}
                      onChangeText={setNewFieldName}
                    />

                    <View style={styles.typeSelector}>
                      {['text', 'number', 'date'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeBadge,
                            newFieldType === type && styles.typeBadgeActive
                          ]}
                          onPress={() => setNewFieldType(type)}
                        >
                          <Text style={[
                            styles.typeText,
                            newFieldType === type && styles.typeTextActive
                          ]}>
                            {type.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {!isSubscriptionExpired && (
                      <TouchableOpacity style={styles.saveFieldButton} onPress={handleAddField}>
                        <Text style={styles.saveFieldText}>+ Add Custom Field</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {fieldsLoading ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <FlatList
                      data={fields}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <View style={styles.fieldRow}>
                          <Text style={styles.fieldName}>{item.fieldName}</Text>
                          <View style={styles.fieldTypeBadge}>
                            <Text style={styles.fieldType}>{item.fieldType}</Text>
                          </View>
                        </View>
                      )}
                      ListEmptyComponent={
                        <Text style={styles.emptyFields}>No custom fields defined yet.</Text>
                      }
                    />
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="construct-outline" size={48} color="#64748B" />
                  <Text style={styles.emptyStateText}>Select a category on the left to manage its custom fields.</Text>
                </View>
              )}
            </View>
          </View>

          {/* New Category Modal */}
          <Modal visible={newCatModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Create Custom Category</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Survey Equipment"
                  placeholderTextColor="#64748B"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setNewCatModalVisible(false)}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleCreateCategory}>
                    <Text style={styles.saveText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <AppSnackbar
            visible={snackbar.visible}
            message={snackbar.message}
            kind={snackbar.kind}
            onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1220',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  layout: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  leftColumn: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 340 : '100%',
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightColumn: {
    flex: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
  },
  categoryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedCard: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  systemBadge: {
    fontSize: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    color: '#94A3B8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    overflow: 'hidden',
  },
  customBadge: {
    fontSize: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    overflow: 'hidden',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  selectedCategoryName: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  fieldsContainer: {
    flex: 1,
  },
  fieldsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  addFieldContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeBadgeActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  typeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  saveFieldButton: {
    backgroundColor: '#10B981',
    padding: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveFieldText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  fieldName: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  fieldTypeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  fieldType: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyFields: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 20,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
