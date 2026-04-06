import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SnackbarKind = 'success' | 'error' | 'info';

type Props = {
  visible: boolean;
  message: string;
  kind?: SnackbarKind;
  onClose: () => void;
  bottom?: number;
};

const AppSnackbar: React.FC<Props> = ({
  visible,
  message,
  kind = 'info',
  onClose,
  bottom = 16,
}) => {
  if (!visible) return null;

  const palette =
    kind === 'success'
      ? {
          borderColor: 'rgba(52, 211, 153, 0.55)',
          backgroundColor: 'rgba(6, 78, 59, 0.96)',
        }
      : kind === 'error'
        ? {
            borderColor: 'rgba(248, 113, 113, 0.6)',
            backgroundColor: 'rgba(127, 29, 29, 0.96)',
          }
        : {
            borderColor: 'rgba(159, 207, 255, 0.45)',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
          };

  return (
    <View style={[styles.wrap, { bottom }]}>
      <View
        style={[
          styles.content,
          {
            borderColor: palette.borderColor,
            backgroundColor: palette.backgroundColor,
          },
        ]}
      >
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color="#E6F3FF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1200,
  },
  content: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    color: '#E6F3FF',
    flex: 1,
    fontWeight: '600',
    paddingRight: 8,
  },
});

export default AppSnackbar;
