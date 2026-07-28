import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';

interface OfficeFieldWidgetProps {
  officeCount: number;
  fieldCount: number;
  onOfficePress?: () => void;
  onFieldPress?: () => void;
}

export const OfficeFieldWidget: React.FC<OfficeFieldWidgetProps> = ({
  officeCount = 0,
  fieldCount = 0,
  onOfficePress,
  onFieldPress,
}) => {
  return (
    <GlassCard title="Office & Field Assets" style={styles.card}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.subCard} onPress={onOfficePress} activeOpacity={0.8}>
          <Ionicons name="business-outline" size={20} color="#F59E0B" />
          <View style={styles.subTextContainer}>
            <Text style={styles.subTitle}>OFFICE ASSETS ({officeCount})</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownText}>OFFICE: <Text style={styles.bold}>{officeCount}</Text></Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fieldIconBadge} onPress={onFieldPress} activeOpacity={0.8}>
          <Ionicons name="radio-outline" size={24} color="#22D3EE" />
          <Text style={styles.fieldBadgeText}>FIELD ({fieldCount})</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  subTextContainer: {
    flex: 1,
  },
  subTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  breakdownText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  bold: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  fieldIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderRadius: 10,
    padding: 10,
  },
  fieldBadgeText: {
    color: '#22D3EE',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
