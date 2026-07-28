import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';

interface AssetHealthWidgetProps {
  overdueCount: number;
  maintenanceCount: number;
}

export const AssetHealthWidget: React.FC<AssetHealthWidgetProps> = ({
  overdueCount = 0,
  maintenanceCount = 0,
}) => {
  const isHealthy = overdueCount === 0 && maintenanceCount === 0;

  return (
    <GlassCard title="Asset Health" style={styles.card}>
      <View style={styles.container}>
        <View style={[styles.badge, { backgroundColor: isHealthy ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
          <Ionicons
            name={isHealthy ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={isHealthy ? '#4ADE80' : '#FCA5A5'}
          />
        </View>

        <View style={styles.metricsRow}>
          <Text style={styles.metricText}>
            OVERDUE: <Text style={[styles.valueText, overdueCount > 0 && styles.overdueValue]}>{overdueCount}</Text>
          </Text>
          <Text style={styles.divider}>|</Text>
          <Text style={styles.metricText}>
            MAINTENANCE: <Text style={styles.valueText}>{maintenanceCount}</Text>
          </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  valueText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  overdueValue: {
    color: '#FCA5A5',
  },
  divider: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 12,
  },
});
