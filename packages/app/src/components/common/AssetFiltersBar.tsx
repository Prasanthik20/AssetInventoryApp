import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
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
}) => {
  const locationItems = normalizeOptions(locationOptions);
  const statusItems = normalizeOptions(statusOptions);

  return (
    <View
      style={[
        styles.controlsRow,
        isMobileLayout && styles.controlsRowMobile,
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
          {showCategory && (
            <View style={[styles.pickerWrapper, pickerWrapperStyle]}>
              <Picker
                selectedValue={categoryValue}
                onValueChange={(value) => onCategoryChange?.(String(value))}
                dropdownIconColor="#A9C6E4"
                style={[styles.picker, pickerStyle]}
              >
                <Picker.Item label={categoryAllLabel} value="" />
                {categoryOptions.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </View>
          )}

          {(showLocation || showStatus) && (
            <View
              style={[
                styles.secondaryFilterRow,
                isMobileLayout && styles.secondaryFilterRowMobile,
              ]}
            >
              {showLocation && (
                <View style={[styles.pickerWrapper, pickerWrapperStyle]}>
                  <Picker
                    selectedValue={locationValue}
                    onValueChange={(value) => onLocationChange?.(String(value))}
                    dropdownIconColor="#A9C6E4"
                    style={[styles.picker, pickerStyle]}
                  >
                    <Picker.Item label={locationAllLabel} value="" />
                    {locationItems.map((location) => (
                      <Picker.Item key={location} label={location} value={location} />
                    ))}
                  </Picker>
                </View>
              )}

              {showStatus && (
                <View style={[styles.pickerWrapper, pickerWrapperStyle]}>
                  <Picker
                    selectedValue={statusValue}
                    onValueChange={(value) => onStatusChange?.(String(value))}
                    dropdownIconColor="#A9C6E4"
                    style={[styles.picker, pickerStyle]}
                  >
                    <Picker.Item label={statusAllLabel} value="" />
                    {statusItems.map((status) => (
                      <Picker.Item key={status} label={status} value={status} />
                    ))}
                  </Picker>
                </View>
              )}
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
    alignItems: 'center',
    gap: 10,
  },
  controlsRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: globalColors.surfacePrimary,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: globalColors.borderSoft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: globalTypography.bodyMd,
    color: '#E6F3FF',
  },
  filterGroup: {
    flex: 3,
    flexDirection: 'row',
    gap: 10,
  },
  filterGroupMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  secondaryFilterRow: {
    flex: 2,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryFilterRowMobile: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: globalColors.surfacePrimary,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: globalColors.borderSoft,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: '100%',
    color: '#E6F3FF',
    backgroundColor: 'transparent',
  },
});

export default AssetFiltersBar;
