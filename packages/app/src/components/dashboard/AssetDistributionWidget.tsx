import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';

interface AssetDistributionWidgetProps {
  assignedCount: number;
  unassignedCount: number;
}

export const AssetDistributionWidget: React.FC<AssetDistributionWidgetProps> = ({
  assignedCount = 0,
  unassignedCount = 0,
}) => {
  const total = (assignedCount + unassignedCount) || 1;
  const assignedPercent = Math.round((assignedCount / total) * 100);
  const unassignedPercent = 100 - assignedPercent;

  return (
    <GlassCard title="Asset Distribution" style={styles.card}>
      <View style={styles.container}>
        {/* Donut Badge Graphic */}
        <View style={styles.donutContainer}>
          <View style={styles.donutCircle}>
            <Text style={styles.donutText}>{assignedPercent}/{unassignedPercent}</Text>
          </View>
        </View>

        {/* Legend List */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#22D3EE' }]} />
            <Text style={styles.legendLabel}>Assigned: {assignedCount}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendLabel}>Unassigned: {unassignedCount}</Text>
          </View>
        </View>
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
    justifyContent: 'space-around',
    gap: 16,
    paddingVertical: 4,
  },
  donutContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#22D3EE',
    borderRightColor: '#F97316',
    borderBottomColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  legendContainer: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});
