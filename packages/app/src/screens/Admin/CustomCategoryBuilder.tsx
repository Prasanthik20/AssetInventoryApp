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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { baseURL } from '../../navigation/types';

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseURL}/api/categories`);
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required.');
      return;
    }
    try {
      await axios.post(`${baseURL}/api/categories`, {
        categoryName: newCategoryName,
      });
      setNewCategoryName('');
      setNewCatModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create category.');
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
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!selectedCategory) return;
    if (!newFieldName.trim()) {
      Alert.alert('Error', 'Field name is required.');
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
    } catch (error) {
      console.error('Error adding field:', error);
      Alert.alert('Error', 'Failed to add custom field.');
    }
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory?.id === item.id && styles.selectedCard
      ]}
      onPress={() => fetchFields(item)}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="folder-open-outline" size={24} color="#4F46E5" />
        <View style={styles.badgeContainer}>
          {item.isSystemCategory && <Text style={styles.systemBadge}>System</Text>}
          {item.isCustom && <Text style={styles.customBadge}>Custom</Text>}
        </View>
      </View>
      <Text style={styles.categoryName}>{item.category}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Asset Categories</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewCatModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>New Category</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.layout}>
        {/* Left Column: Categories List */}
        <View style={styles.leftColumn}>
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
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
                Fields for {selectedCategory.category}
              </Text>
              
              <View style={styles.addFieldContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Field Name (e.g. Calibration Date)"
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

                <TouchableOpacity style={styles.saveFieldButton} onPress={handleAddField}>
                  <Text style={styles.saveFieldText}>Add Field</Text>
                </TouchableOpacity>
              </View>

              {fieldsLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <FlatList
                  data={fields}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldName}>{item.fieldName}</Text>
                      <Text style={styles.fieldType}>{item.fieldType}</Text>
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
              <Ionicons name="construct-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>Select a category to manage its dynamic fields.</Text>
            </View>
          )}
        </View>
      </View>

      {/* New Category Modal */}
      <Modal visible={newCatModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Custom Category</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Survey Equipment"
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  leftColumn: {
    flex: 1,
    maxWidth: 350,
  },
  rightColumn: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  selectedCard: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  systemBadge: {
    fontSize: 10,
    backgroundColor: '#E2E8F0',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  customBadge: {
    fontSize: 10,
    backgroundColor: '#DBEAFE',
    color: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 16,
  },
  fieldsContainer: {
    flex: 1,
  },
  fieldsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  addFieldContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
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
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  typeBadgeActive: {
    backgroundColor: '#4F46E5',
  },
  typeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#fff',
  },
  saveFieldButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveFieldText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fieldName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  fieldType: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  emptyFields: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    padding: 10,
  },
  cancelText: {
    color: '#64748B',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
