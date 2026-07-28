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
  onAssignPress?: (asset: Asset) => void;
  onNotifyPress?: (asset: Asset) => void;
  index?: number;
}

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === '—') return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
};

/**
 * Glass‑morphism styled card presenting an asset summary.
 * Re‑uses the status color logic from the existing screens.
 */
const AssetCard: React.FC<AssetCardProps> = ({ asset, isMobileLayout, onPress, onAssignPress, onNotifyPress, index }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'AssetFullDetails'>>();
  const handlePress = onPress ?? (() => navigation.navigate('AssetFullDetails', { asset }));
  const isUnassigned = !asset.assignedTo || asset.status?.toLowerCase() === 'unassigned';
  const isOverdue = asset.status?.toLowerCase() === 'overdue';

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
            <Text style={styles.label}>Expected Return Date</Text>
            <Text style={styles.value}>{formatDate(asset.expectedReturnDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned Date</Text>
            <Text style={styles.value}>{formatDate(asset.assignedDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned To</Text>
            <Text style={styles.value}>{asset.assignedTo || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned By</Text>
            <Text style={styles.value}>{asset.assignedBy || '—'}</Text>
          </View>
          {asset.depreciationMessage && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText} numberOfLines={1}>
                ⚠️ {asset.depreciationMessage}
              </Text>
            </View>
          )}
          <View style={styles.actionRow}>
            {onAssignPress && isUnassigned && (
              <TouchableOpacity onPress={() => onAssignPress(asset)} style={[styles.actionButton, styles.assignButton]}>
                <Text style={styles.actionText}>Assign Asset</Text>
              </TouchableOpacity>
            )}
            {onNotifyPress && isOverdue && (
              <TouchableOpacity onPress={() => onNotifyPress(asset)} style={[styles.actionButton, styles.notifyButton]}>
                <Text style={styles.actionText}>Notify Employee</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handlePress} style={styles.actionButton}>
              <Text style={styles.actionText}>Details</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.columnsContainer}>
          {/* Column 1: Asset Identifiers */}
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

          {/* Column 2: Status & Dates */}
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor, borderColor }]}>
                <Text style={[styles.statusText, { color: textColor }]}>{asset.status}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Expected Due Date</Text>
              <Text style={styles.value}>{formatDate(asset.expectedReturnDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Assigned Date</Text>
              <Text style={styles.value}>{formatDate(asset.assignedDate)}</Text>
            </View>
          </View>

          {/* Column 3: Assignment & Actions */}
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={styles.label}>Assigned To</Text>
              <Text style={styles.value}>{asset.assignedTo || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Assigned By</Text>
              <Text style={styles.value}>{asset.assignedBy || '—'}</Text>
            </View>
            {asset.depreciationMessage && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText} numberOfLines={1}>
                  ⚠️ {asset.depreciationMessage}
                </Text>
              </View>
            )}
            <View style={styles.actionRow}>
              {onAssignPress && isUnassigned && (
                <TouchableOpacity onPress={() => onAssignPress(asset)} style={[styles.actionButton, styles.assignButton]}>
                  <Text style={styles.actionText}>Assign Asset</Text>
                </TouchableOpacity>
              )}
              {onNotifyPress && isOverdue && (
                <TouchableOpacity onPress={() => onNotifyPress(asset)} style={[styles.actionButton, styles.notifyButton]}>
                  <Text style={styles.actionText}>Notify Employee</Text>
                </TouchableOpacity>
              )}
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
    padding: 14,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    flex: 1.3,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  warningText: { color: '#FCA5A5', fontSize: 11, flex: 1 },
  actionRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionButton: { backgroundColor: globalColors.brandPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  assignButton: { backgroundColor: '#0F766E' },
  notifyButton: { backgroundColor: '#DC2626' },
  actionText: { color: globalColors.surfaceGlassLight, fontSize: 12, fontWeight: '600' },
});

export default AssetCard;
