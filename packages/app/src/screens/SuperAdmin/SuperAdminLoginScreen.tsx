import React, { useRef, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Checkbox from "expo-checkbox";
import { useNavigation } from "@react-navigation/native";
import { Feather } from '@expo/vector-icons';
import AppSnackbar from 'src/components/common/AppSnackbar';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    kind: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', kind: 'info' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSnackbar({ visible: true, message, kind });
    timeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

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
      showSnackbar("Please check your email or password", 'error');
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
            placeholderTextColor="#7FA2C8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordFieldContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor="#7FA2C8"
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
                color="#A9C6E4"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.rememberRow}>
            <Checkbox value={remember} onValueChange={setRemember} color="#22D3EE" />
            <Text style={styles.rememberText}>Remember Me</Text>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <LinearGradient
              colors={["#0EA5E9", "#0F766E"]}
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
            <Text style={{ color: "#A9C6E4", textAlign: "center" }}>
                Go to Users Login →
            </Text>
          </TouchableOpacity>

          {/* <View style={styles.platformIcons}>
            <Text style={styles.platformText}>🌐 Web   📱 Android   🍎 iOS</Text>
          </View> */}

          {/* <Text style={styles.mockHint}>
            Demo: admin@super.com / 12345
          </Text> */}
        </View>
      </SafeAreaView>
      <AppSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        kind={snackbar.kind}
        onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        bottom={isMobileLayout ? 16 : 20}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
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
    backgroundColor: "rgba(18, 45, 73, 0.82)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    margin: 10,
    shadowColor: "#001325",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  rightCard: {
    flex: 1,
    backgroundColor: "rgba(7, 24, 42, 0.9)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 20,
    padding: 30,
    margin: 10,
    shadowColor: "#001325",
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
    color: "#E6F3FF",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#A9C6E4",
    marginTop: 5,
  },
  header: {
    color: "#E6F3FF",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    color: "#E6F3FF",
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
    color: "#A9C6E4",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  platformIcons: {
    alignItems: "center",
    marginTop: 10,
  },
  platformText: {
    color: "#A9C6E4",
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
