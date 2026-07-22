import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';

interface ActionItem {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'warning';
}

interface QuickActionsPanelProps {
  actions: ActionItem[];
  title?: string;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  title = 'QUICK ACTIONS',
}) => {
  const getButtonStyle = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'rgba(34, 211, 238, 0.12)', borderColor: '#22D3EE', textColor: '#38BDF8' };
      case 'accent':
        return { backgroundColor: 'rgba(249, 115, 22, 0.12)', borderColor: '#F97316', textColor: '#FB923C' };
      case 'warning':
        return { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444', textColor: '#FCA5A5' };
      default:
        return { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(34, 211, 238, 0.4)', textColor: '#E2E8F0' };
    }
  };

  return (
    <GlassCard title={title} style={styles.card}>
      <View style={styles.buttonList}>
        {actions.map((action) => {
          const { backgroundColor, borderColor, textColor } = getButtonStyle(action.variant);
          return (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { backgroundColor, borderColor }]}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <Ionicons name={action.iconName} size={16} color={textColor} />
              <Text style={[styles.actionText, { color: textColor }]}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  buttonList: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
