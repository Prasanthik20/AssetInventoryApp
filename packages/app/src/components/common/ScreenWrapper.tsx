import React, { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { globalColors } from '../../styles/globalStyles';

interface ScreenWrapperProps {
  children: ReactNode;
  /** Optional style for inner content container */
  contentContainerStyle?: ViewStyle;
}

/**
 * A premium wrapper used across asset listing screens.
 * Applies a dark‑mode friendly gradient background, safe‑area handling,
 * and a common header placeholder (you can replace AppHeader later).
 */
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, contentContainerStyle }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[globalColors.backgroundSoft, globalColors.backgroundPanel]}
        style={styles.gradient}
      >
        {/* Header placeholder – you can replace with a real AppHeader component */}
        {/* <AppHeader title="Asset Inventory" /> */}
        <View style={[styles.content, contentContainerStyle] as any}>
          {children}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: globalColors.backgroundSoft,
  },
  gradient: {
    flex: 1,
    // padding: 16,
  },
  content: {
    flex: 1,
    // inner padding can be overridden via prop
    paddingHorizontal: 8,
  },
});

export default ScreenWrapper;
