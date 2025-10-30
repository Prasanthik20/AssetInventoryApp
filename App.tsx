import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🚀 AssetFlow Login Screen Working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eaf0ff',
  },
  text: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a2e63',
  },
});