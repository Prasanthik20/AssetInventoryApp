import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Asset, RootStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalColors } from '../../styles/globalStyles';

interface AssetCardProps {
  asset: Asset;
  isMobileLayout: boolean;
  onPress?: () => void;
  index?: number;
}

/**
 * Glass‑morphism styled card presenting an asset summary.
 * Re‑uses the status color logic from the existing screens.
 */
const AssetCard: React.FC<AssetCardProps> = ({ asset, isMobileLayout, onPress, index }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'AssetFullDetails'>>();
  const handlePress = onPress ?? (() => navigation.navigate('AssetFullDetails', { asset }));

  const getStatusStyle = () => {
    let backgroundColor = 'rgba(148, 163, 184, 0.18)';
    let borderColor = '#94A3B8';
    let textColor = '#E2E8F0';
    switch (asset.status?.toLowerCase()) {
      case 'assigned':
        backgroundColor = 'rgba(34, 211, 238, 0.18)';
        borderColor = '#22D3EE';
        textColor = '#A5F3FC';
        break;
      case 'overdue':
        backgroundColor = 'rgba(249, 115, 115, 0.18)';
        borderColor = '#F97373';
        textColor = '#FECACA';
        break;
      case 'returned':
        backgroundColor = 'rgba(52, 211, 153, 0.18)';
        borderColor = '#34D399';
        textColor = '#A7F3D0';
        break;
      default:
        break;
    }
    return { backgroundColor, borderColor, textColor };
  };

  const { backgroundColor, borderColor, textColor } = getStatusStyle();

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      {isMobileLayout ? (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>S.No</Text>
            <Text style={styles.value}>{index !== undefined ? index + 1 : '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Asset Name</Text>
            <Text style={styles.value}>{asset.assetName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Barcode</Text>
            <Text style={styles.value}>{asset.barcode || asset.serialNumber || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor, borderColor }]}>
              <Text style={[styles.statusText, { color: textColor }]}>{asset.status}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expected Due Date</Text>
            <Text style={styles.value}>{asset.expectedReturnDate || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned Date</Text>
            <Text style={styles.value}>{asset.assignedDate || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned By</Text>
            <Text style={styles.value}>{asset.assignedBy || '—'}</Text>
          </View>
          {asset.depreciationMessage && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderWidth: 1,
              borderRadius: 6,
              padding: 6,
              marginTop: 6
            }}>
              <Text style={{ color: '#FCA5A5', fontSize: 11, flex: 1 }} numberOfLines={1}>
                ⚠️ {asset.depreciationMessage}
              </Text>
            </View>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handlePress} style={styles.actionButton}>
              <Text style={styles.actionText}>Details</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.columnsContainer}>
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={styles.label}>S.No</Text>
              <Text style={styles.value}>{index !== undefined ? index + 1 : '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Asset Name</Text>
              <Text style={styles.value}>{asset.assetName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Barcode</Text>
              <Text style={styles.value}>{asset.barcode || asset.serialNumber || '—'}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor, borderColor }]}>
                <Text style={[styles.statusText, { color: textColor }]}>{asset.status}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Expected Due Date</Text>
              <Text style={styles.value}>{asset.expectedReturnDate || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Assigned Date</Text>
              <Text style={styles.value}>{asset.assignedDate || '—'}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={styles.label}>Assigned By</Text>
              <Text style={styles.value}>{asset.assignedBy || '—'}</Text>
            </View>
            {asset.depreciationMessage && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderWidth: 1,
                borderRadius: 6,
                padding: 6,
                marginTop: 6
              }}>
                <Text style={{ color: '#FCA5A5', fontSize: 11, flex: 1 }} numberOfLines={1}>
                  ⚠️ {asset.depreciationMessage}
                </Text>
              </View>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handlePress} style={styles.actionButton}>
                <Text style={styles.actionText}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: globalColors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: globalColors.borderSoftCard,
    padding: 12,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  // Retain existing card style for potential reuse (now hidden)
  card: {
    backgroundColor: globalColors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: globalColors.borderSoftCard,
    padding: 12,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  label: { color: '#f2f5faff', fontSize: 12, flex: 1 },
  value: { color: '#E6F3FF', fontSize: 12, flex: 2, textAlign: 'right' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: '500' },
  actionRow: { marginTop: 8, alignItems: 'flex-end' },
  actionButton: { backgroundColor: globalColors.brandPrimary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionText: { color: globalColors.surfaceGlassLight, fontSize: 12, fontWeight: '600' },
});

export default AssetCard;
