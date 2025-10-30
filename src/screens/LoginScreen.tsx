import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Checkbox from "expo-checkbox";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleLogin = () => {
    console.log("Login pressed:", { email, password, remember });
    // Navigation or authentication logic will go here
  };

  return (
    <LinearGradient
      colors={["#4A00E0", "#8E2DE2"]}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        {/* Left Section */}
        <View style={styles.leftCard}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/3064/3064197.png",
            }}
            style={styles.icon}
          />
          <Text style={styles.title}>SUPER ADMIN</Text>
          <Text style={styles.subtitle}>PLATFORM ACCESS</Text>
        </View>

        {/* Right Section */}
        <View style={styles.rightCard}>
          <Text style={styles.header}>Super Admin Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.rememberRow}>
            <Checkbox value={remember} onValueChange={setRemember} color="#4A00E0" />
            <Text style={styles.rememberText}>Remember Me</Text>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <LinearGradient
              colors={["#00c6ff", "#0072ff"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.loginText}>LOG IN</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.platformIcons}>
            <Text style={styles.platformText}>🌐 Web   📱 Android   🍎 iOS</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    width: "90%",
    maxWidth: 900,
  },
  leftCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    margin: 10,
  },
  rightCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 25,
    margin: 10,
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#e0e0e0",
    marginTop: 5,
  },
  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    color: "#fff",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberText: {
    color: "#fff",
    marginLeft: 8,
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  buttonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  platformIcons: {
    alignItems: "center",
  },
  platformText: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
  },
});