import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';

interface StatMetricCardProps {
  title: string;
  count: number | string;
  iconName: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  onPress?: () => void;
}

export const StatMetricCard: React.FC<StatMetricCardProps> = ({
  title,
  count,
  iconName,
  accentColor = '#22D3EE',
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.touchable}
    >
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1A`, borderColor: accentColor }]}>
            <Ionicons name={iconName} size={18} color={accentColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.count}>{count}</Text>

          {/* Backdrop Graphic Watermark */}
          <View style={styles.watermarkContainer}>
            <Ionicons name={iconName} size={48} color={`${accentColor}15`} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    minWidth: 150,
  },
  card: {
    padding: 14,
    marginBottom: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  title: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  count: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
});
