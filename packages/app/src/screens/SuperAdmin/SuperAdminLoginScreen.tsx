import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Platform,
  Alert,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Checkbox from "expo-checkbox";
import { useNavigation } from "@react-navigation/native";
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // ✅ Mock credentials
  const mockAdmin = {
    email: "admin@super.com",
    password: "12345",
  };

  const handleLogin = () => {
    console.log("Login pressed:", { email, password, remember });

    if (email === mockAdmin.email && password === mockAdmin.password) {
      navigation.navigate("SuperAdminDashboard" as never);
    } else {
      Alert.alert("Invalid Credentials", "Please check your email or password");
    }
  };

  return (
    <ImageBackground
          source={require("../../assets/Company-bg.webp")} // 👈 place your background image in /assets folder
          style={styles.backgroundImage}
          resizeMode="cover"
          blurRadius={7}
        >
      <SafeAreaView style={[styles.container, isMobileLayout && { flexDirection: 'column', width: '94%' }]}>
        {/* Left Section */}
        <View style={[styles.leftCard, isMobileLayout && { width: '100%', marginBottom: 8 }]}>
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
        <View style={[styles.rightCard, isMobileLayout && { width: '100%' }]}>
          <Text style={styles.header}>Super Admin Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#333"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordFieldContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor="#333"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color="#1f2937"
              />
            </TouchableOpacity>
          </View>

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

           {/* 🌟 Company User Login Button */}
          <TouchableOpacity
                style={{ marginTop: 10 }}
                onPress={() => navigation.navigate("CompanyLogin" as never)}
            >
            <Text style={{ color: "#000000ff", textAlign: "center" }}>
                Go to Company Users Login →
            </Text>
          </TouchableOpacity>

          <View style={styles.platformIcons}>
            <Text style={styles.platformText}>🌐 Web   📱 Android   🍎 iOS</Text>
          </View>

          {/* <Text style={styles.mockHint}>
            Demo: admin@super.com / 12345
          </Text> */}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    //flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    width: "90%",
    maxWidth: 950,
  },
  leftCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    margin: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  rightCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 30,
    margin: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: "#000000ff",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#0f0101ff",
    marginTop: 5,
  },
  header: {
    color: "#000000ff",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    color: "#000000ff",
  },
  passwordFieldContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 46,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 2,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberText: {
    color: "#000000ff",
    marginLeft: 8,
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  loginText: {
    color: "#000000ff",
    fontSize: 16,
    fontWeight: "bold",
  },
  platformIcons: {
    alignItems: "center",
    marginTop: 10,
  },
  platformText: {
    color: "#000000ff",
    fontSize: 14,
    opacity: 0.9,
  },
  mockHint: {
    color: "#000000ff",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
});
