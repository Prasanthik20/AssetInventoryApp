import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';

interface SubscriptionLimitBarProps {
  planName?: string;
  status?: string;
  renewDate?: string;
  usedUsers?: number;
  maxUsers?: number;
  usedAssets?: number;
  maxAssets?: number;
}

export const SubscriptionLimitBar: React.FC<SubscriptionLimitBarProps> = ({
  planName = 'Free Trial Plan',
  status = 'TRIALING',
  renewDate = '13/06/2026',
  usedUsers = 3,
  maxUsers = 5,
  usedAssets = 4,
  maxAssets = 100,
}) => {
  const userPercent = Math.min(100, Math.max(0, (usedUsers / (maxUsers || 1)) * 100));
  const assetPercent = Math.min(100, Math.max(0, (usedAssets / (maxAssets || 1)) * 100));

  return (
    <GlassCard style={styles.card} variant="highlight">
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.planTitle}>{planName} - </Text>
          <Text style={styles.planStatus}>{status}</Text>
        </View>
        <Text style={styles.renewText}>Renews: {renewDate}</Text>
      </View>

      <View style={styles.limitContainer}>
        {/* User Limits */}
        <View style={styles.limitGroup}>
          <View style={styles.limitLabelRow}>
            <Text style={styles.limitLabel}>User Limits</Text>
            <Text style={styles.limitValue}>{usedUsers} / {maxUsers}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${userPercent}%`, backgroundColor: '#22D3EE' }]} />
          </View>
        </View>

        {/* Asset Limits */}
        <View style={styles.limitGroup}>
          <View style={styles.limitLabelRow}>
            <Text style={styles.limitLabel}>Asset Limits</Text>
            <Text style={styles.limitValue}>{usedAssets} / {maxAssets}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${assetPercent}%`, backgroundColor: '#818CF8' }]} />
          </View>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  planStatus: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  renewText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  limitContainer: {
    gap: 10,
  },
  limitGroup: {
    gap: 4,
  },
  limitLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  limitValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
