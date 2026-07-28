import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
  Platform,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { globalColors, globalTypography } from 'src/styles/globalStyles';

type OptionValue = string | null | undefined;

type AssetFiltersBarProps = {
  isMobileLayout?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showCategory?: boolean;
  categoryValue?: string;
  onCategoryChange?: (value: string) => void;
  categoryOptions?: readonly string[];
  categoryAllLabel?: string;
  showLocation?: boolean;
  locationValue?: string;
  onLocationChange?: (value: string) => void;
  locationOptions?: OptionValue[];
  locationAllLabel?: string;
  showStatus?: boolean;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: OptionValue[];
  statusAllLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  searchContainerStyle?: StyleProp<ViewStyle>;
  searchInputStyle?: StyleProp<TextStyle>;
  filtersContainerStyle?: StyleProp<ViewStyle>;
  pickerWrapperStyle?: StyleProp<ViewStyle>;
  pickerStyle?: StyleProp<TextStyle>;
  pickerItemColor?: string;
};

const normalizeOptions = (options: OptionValue[] = []): string[] => {
  return Array.from(
    new Set(
      options
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 0),
    ),
  );
};

type ModalPickerProps = {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  allLabel: string;
  pickerWrapperStyle?: StyleProp<ViewStyle>;
  pickerStyle?: StyleProp<TextStyle>;
  title: string;
};

const ModalPicker: React.FC<ModalPickerProps> = ({
  selectedValue,
  onValueChange,
  options,
  allLabel,
  pickerWrapperStyle,
  pickerStyle,
  title,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const currentLabel = selectedValue === '' ? allLabel : selectedValue;

  const handleSelect = (val: string) => {
    onValueChange(val);
    setModalVisible(false);
  };

  const listItems = ['', ...options];

  return (
    <>
      <TouchableOpacity
        style={StyleSheet.flatten([styles.pickerWrapper, pickerWrapperStyle])}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.pickerSelector}>
          <Text
            style={[
              styles.pickerSelectorText,
              StyleSheet.flatten(pickerStyle),
              { height: 'auto' },
              selectedValue === '' && styles.pickerSelectorPlaceholder
            ]}
            numberOfLines={1}
          >
            {currentLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#A9C6E4" style={styles.pickerChevron} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#A9C6E4" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={listItems}
                  keyExtractor={(item, index) => item || `all-options-${index}`}
                  style={styles.modalList}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedValue;
                    const label = item === '' ? allLabel : item;
                    return (
                      <TouchableOpacity
                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                        onPress={() => handleSelect(item)}
                      >
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                          {label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#34D399" />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const AssetFiltersBar: React.FC<AssetFiltersBarProps> = ({
  isMobileLayout = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showCategory = false,
  categoryValue = '',
  onCategoryChange,
  categoryOptions = [],
  categoryAllLabel = 'All Categories',
  showLocation = false,
  locationValue = '',
  onLocationChange,
  locationOptions = [],
  locationAllLabel = 'All Locations',
  showStatus = false,
  statusValue = '',
  onStatusChange,
  statusOptions = [],
  statusAllLabel = 'All Status',
  containerStyle,
  searchContainerStyle,
  searchInputStyle,
  filtersContainerStyle,
  pickerWrapperStyle,
  pickerStyle,
  pickerItemColor = '#E6F3FF',
}) => {
  const locationItems = normalizeOptions(locationOptions);
  const statusItems = normalizeOptions(statusOptions);

  const renderCategoryPicker = () => {
    // Use ModalPicker for both web and mobile to ensure consistent dark theme styling
    const wrapperStyle = isMobileLayout
      ? [pickerWrapperStyle, styles.categoryWrapperMobile]
      : [pickerWrapperStyle];
    return (
      <ModalPicker
        selectedValue={categoryValue}
        onValueChange={(val) => onCategoryChange?.(val)}
        options={categoryOptions}
        allLabel={categoryAllLabel}
        pickerWrapperStyle={wrapperStyle}
        pickerStyle={pickerStyle}
        title="Select Category"
      />
    );
  };

  const renderLocationPicker = () => {
    // Use ModalPicker for both web and mobile for consistent styling
    return (
      <ModalPicker
        selectedValue={locationValue}
        onValueChange={(val) => onLocationChange?.(val)}
        options={locationItems}
        allLabel={locationAllLabel}
        pickerWrapperStyle={pickerWrapperStyle}
        pickerStyle={pickerStyle}
        title="Select Location"
      />
    );
  };



  const renderStatusPicker = () => {
    // Use ModalPicker for both web and mobile for consistent dark theme
    return (
      <ModalPicker
        selectedValue={statusValue}
        onValueChange={(val) => onStatusChange?.(val)}
        options={statusItems}
        allLabel={statusAllLabel}
        pickerWrapperStyle={pickerWrapperStyle}
        pickerStyle={pickerStyle}
        title="Select Status"
      />
    );
  };

  return (
    <View
      style={[
        isMobileLayout ? styles.controlsRowMobile : styles.controlsRow,
        containerStyle,
      ]}
    >
      <View style={[styles.searchContainer, searchContainerStyle]}>
        <Feather name="search" size={18} color="#A9C6E4" />
        <TextInput
          placeholder={searchPlaceholder}
          placeholderTextColor="#7FA2C8"
          style={[styles.searchInput, searchInputStyle]}
          value={searchValue}
          onChangeText={onSearchChange}
        />
      </View>

      {(showCategory || showLocation || showStatus) && (
        <View
          style={[
            styles.filterGroup,
            isMobileLayout && styles.filterGroupMobile,
            filtersContainerStyle,
          ]}
        >
          {showCategory && renderCategoryPicker()}

          {(showLocation || showStatus) && (
            <View
              style={[
                styles.secondaryFilterRow,
                isMobileLayout && styles.secondaryFilterRowMobile,
              ]}
            >
              {showLocation && renderLocationPicker()}
              {showStatus && renderStatusPicker()}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // align items to top for proper wrapping
    gap: 10,
    flexWrap: 'wrap', // allow components to wrap on small screens
    marginTop: 10,
    zIndex: 10,
    elevation: 10,
  },
  controlsRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flexShrink: 0,
    flexWrap: 'nowrap',
    marginTop: 10,
    zIndex: 10,
    elevation: 10,
  },
  searchContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: globalColors.surfacePrimary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
    borderWidth: 1,
    borderColor: globalColors.borderSoft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: globalTypography.bodyMd,
    color: globalColors.textTitle,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 10,
    // marginBottom: 12, // space below filter group to separate from content
  },
  filterGroupMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  secondaryFilterRow: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  secondaryFilterRowMobile: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerWrapper: {
    backgroundColor: globalColors.backgroundPanel,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: globalColors.borderSoft,
    overflow: 'hidden', // prevent picker overflow on Android
    flex: 1,
  },
  // Mobile override for category picker: uses explicit height instead of flex-based sizing.
  // IMPORTANT: flex: 0 overrides the screen's flex: 1 (same shorthand, last-in-array wins).
  // minHeight: 54 ensures height is respected after flex: 0 sets flexBasis: 0 → 0px.
  // Yoga applies min/max AFTER flex calculation, so minHeight is the reliable floor.
  categoryWrapperMobile: {
    flex: 0,
    width: '100%',
    minHeight: 54,
    height: 54,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'android' ? 50 : '100%',
    color: '#E6F3FF',
    backgroundColor: globalColors.backgroundPanel,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
    paddingLeft: 12,
    position: 'relative',
  },
  pickerSelectorText: {
    fontSize: 14,
    color: '#E6F3FF',
    flex: 1,
    textAlign: 'left',
    paddingRight: 28, // space to avoid overlapping the absolutely positioned icon
  },
  pickerSelectorPlaceholder: {
    color: '#7FA2C8',
  },
  pickerChevron: {
    position: 'absolute',
    right: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '60%',
    backgroundColor: 'rgba(18, 45, 73, 0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(159, 207, 255, 0.35)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(159, 207, 255, 0.15)',
    paddingBottom: 10,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E6F3FF',
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(159, 207, 255, 0.1)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(159, 207, 255, 0.1)',
    borderRadius: 8,
  },
  modalItemText: {
    fontSize: 14,
    color: '#E6F3FF',
  },
  modalItemTextSelected: {
    fontWeight: 'bold',
    color: '#34D399',
  },
});

export default AssetFiltersBar;
