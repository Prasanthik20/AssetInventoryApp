import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  Platform,
  useWindowDimensions,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Checkbox from "expo-checkbox";
import { useNavigation } from "@react-navigation/native";
import { Feather } from '@expo/vector-icons';
import AppSnackbar from 'src/components/common/AppSnackbar';
import { spacing } from "src/theme";

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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          // Use 'padding' for iOS and 'height' for Android to handle the keyboard correctly
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, width: '100%' }}
        >
          <ScrollView
            // flexGrow: 1 allows content to center when small, but scroll when keyboard opens
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={isMobileLayout ? styles.loginContainerMobile : styles.loginContainer}
            >
              {/* Left Decorative Panel */}
              <View
                style={isMobileLayout ? styles.leftPanelMobile : styles.leftPanel}
              >
                <Image
                  source={require('../../assets/Asq_Logo_IV.png')}
                  style={isMobileLayout ? styles.imageMobile : styles.image}
                  resizeMode="contain"
                />
                <Text
                  style={isMobileLayout ? styles.leftTitleMobile : styles.leftTitle}
                >
                  A SQUARE TECHNOLOGIES
                </Text>
                <Text style={styles.leftSubtitle}>SECURE ASSET MANAGEMENT</Text>
              </View>
              <View
                style={isMobileLayout ? styles.rightPanelMobile : styles.rightPanel}
              >
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/Login_logo.jpg')}
                    style={isMobileLayout ? styles.logoMobile : styles.logo}
                  />
                  <Text
                    style={isMobileLayout ? styles.welcomeMobile : styles.welcome}
                  >
                    Welcome !
                  </Text>
                  <Text style={styles.signInText}>Super Admin</Text>
                </View>

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
                <View style={isMobileLayout ? { flexDirection: 'column', gap: 10, width: '100%' } : { flexDirection: "row", gap: 10, alignItems: 'center', justifyContent: "space-around" }}>

                  <TouchableOpacity style={[styles.loginButton, isMobileLayout && { width: '100%' }]} onPress={handleLogin}>
                    <LinearGradient
                      colors={["#0EA5E9", "#0F766E"]}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.loginText}>LOG IN</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* 🌟 Company User Login Button */}
                  <TouchableOpacity style={[styles.loginButton, isMobileLayout && { width: '100%' }]}
                    onPress={() => navigation.navigate("CompanyLogin" as never)}
                  >
                    <LinearGradient
                      colors={["#235972ff", "#3aaca2ff"]}
                      style={styles.buttonGradient}
                    >

                      <Text style={styles.loginText}>User Login</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    // flexDirection: "row",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    // width: "90%",
    // maxWidth: 950,
  },
  leftCard: {
    flex: 1,
    // backgroundColor: "rgba(18, 45, 73, 0.82)",
    // borderWidth: 1,
    // borderColor: 'rgba(159, 207, 255, 0.22)',
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
    // backgroundColor: "rgba(7, 24, 42, 0.9)",
    // borderWidth: 1,
    // borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    shadowColor: "#001325",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  icon: {
    width: 30,
    height: 30,
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

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberText: {
    color: "#A9C6E4",
    marginLeft: 8,
  },

  mockHint: {
    color: "#000000ff",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    backgroundColor: '#071425',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },

  // new
  loginContainer: {
    flexDirection: 'row',
    width: '75%',
    minHeight: 550,
    alignSelf: 'center',
    maxWidth: 1000,
    backgroundColor: 'rgba(7, 24, 42, 0.84)',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    // Add vertical margin so it doesn't touch screen edges on small phones
    marginVertical: 40,
    elevation: 10,
  },
  loginContainerMobile: {
    flexDirection: 'column',
    width: '92%',
    alignSelf: 'center',
    backgroundColor: 'rgba(7, 24, 42, 0.84)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    marginVertical: 20,
    elevation: 10,
  },
  leftPanel: {
    // flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(18, 45, 73, 0.7)',
  },
  leftPanelMobile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'rgba(18, 45, 73, 0.7)',
  },
  image: {
    width: 300,
    height: 150,
  },
  imageMobile: {
    width: 200,
    height: 80,
  },
  leftTitle: {
    fontSize: 26,
    color: '#E6F3FF',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  leftTitleMobile: {
    fontSize: 20,
    color: '#E6F3FF',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  leftSubtitle: {
    fontSize: 16,
    color: '#A9C6E4',
    marginTop: 8,
    fontWeight: '500',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 42, 0.92)',
    padding: 50,
    justifyContent: 'center',
  },
  rightPanelMobile: {
    padding: 20,
    backgroundColor: 'rgba(7, 24, 42, 1)',
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 15 : 25,
  },
  logo: {
    width: 80,
    height: 70,
    marginBottom: 10,
    borderRadius: 8,
  },
  logoMobile: {
    width: 60,
    height: 50,
    marginBottom: 10,
    borderRadius: 8,
  },
  welcome: {
    color: '#E6F3FF',
    fontSize: 24,
    fontWeight: '600',
  },
  welcomeMobile: {
    color: '#E6F3FF',
    fontSize: 22,
    fontWeight: '600',
  },
  signInText: {
    color: '#A9C6E4',
    fontSize: 15,
    marginTop: 2,
  },
  input: {
    backgroundColor: 'rgba(18, 45, 73, 0.86)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    color: '#E6F3FF',
  },
  passwordFieldContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 2,
  },
  loginButton: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
    width: "50%"
  },
  buttonGradient: {
    // paddingVertical: 15,
    padding: 15,
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    color: '#A9C6E4',
    marginTop: 0,
  },
  platformIcons: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  platformText: {
    color: '#A9C6E4',
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  forgotPasswordText: {
    color: '#22D3EE',
    fontWeight: '500',
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  registerText: {
    color: '#A9C6E4',
    fontSize: 15,
  },
  registerLink: {
    color: '#0EA5E9',
    fontWeight: 'bold',
    fontSize: 15,
  },
});