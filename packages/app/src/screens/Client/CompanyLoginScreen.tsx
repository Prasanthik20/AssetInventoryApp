import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  KeyboardAvoidingView,
  Alert,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { baseURL, RootStackParamList } from '../../navigation/types';
import { Feather } from '@expo/vector-icons';

type CompanyLoginNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CompanyLogin'
>;
type CompanyLoginProps = {
  setUser: React.Dispatch<React.SetStateAction<any>>;
};

export default function CompanyLoginScreen({ setUser }: CompanyLoginProps) {
  const navigation = useNavigation<CompanyLoginNavigationProp>();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      const response: any = await axios.post(`${baseURL}/api/auth/login`, {
        email,
        password,
      });

      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

      Alert.alert('Login Successful', `Welcome!`);

      setUser(response.data.user); // 🔥 This switches stack automatically
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert('Login Failed', error.response.data.message);
      } else {
        Alert.alert('Connection Error', 'Could not connect to server.');
      }
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
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
              style={[
                styles.loginContainer,
                isMobileLayout && styles.loginContainerMobile,
              ]}
            >
              {/* Left Decorative Panel */}
              <View
                style={[
                  styles.leftPanel,
                  isMobileLayout && styles.leftPanelMobile,
                ]}
              >
                <Image
                  source={require('../../assets/nscllp.png')}
                  style={[styles.image, isMobileLayout && styles.imageMobile]}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.leftTitle,
                    isMobileLayout && styles.leftTitleMobile,
                  ]}
                >
                  A SQUARE TECHNOLOGIES
                </Text>
                <Text style={styles.leftSubtitle}>SECURE ASSET MANAGEMENT</Text>
              </View>

              {/* Right Form Panel */}
              {/* <KeyboardAvoidingView
                            behavior={Platform.OS === "android" ? "height" : "padding"}
                            style={{ flex: 1 }}
                        > */}
              <View
                style={[
                  styles.rightPanel,
                  isMobileLayout && styles.rightPanelMobile,
                ]}
              >
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/Login_logo.jpg')}
                    style={[styles.logo, isMobileLayout && styles.logoMobile]}
                  />
                  <Text
                    style={[
                      styles.welcome,
                      isMobileLayout && styles.welcomeMobile,
                    ]}
                  >
                    Welcome !
                  </Text>
                  <Text style={styles.signInText}>Sign in to your account</Text>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />

                <View style={styles.passwordFieldContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      { color: '#000' },
                    ]}
                    placeholder="Password"
                    placeholderTextColor="#888"
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
                      color="#475569"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                >
                  <LinearGradient
                    colors={['#00c6ff', '#0072ff']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.loginText}>LOG IN</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 20 }}
                  onPress={() => navigation.navigate('SuperAdminLogin')}
                >
                  <Text style={styles.linkText}>
                    Login as{' '}
                    <Text style={{ fontWeight: 'bold', color: '#0072ff' }}>
                      Super Admin
                    </Text>
                  </Text>
                </TouchableOpacity>

                <View style={styles.platformIcons}>
                  <Text style={styles.platformText}>
                    🌐 Web 📱 Android 
                    {/* 🍎 iOS */}
                  </Text>
                </View>
              </View>
              {/* </KeyboardAvoidingView> */}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// --- STYLES COMPLETELY REVISED TO MATCH THE NEW IMAGE ---
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(61, 138, 233, 0.4)',
  },
  loginContainer: {
    flexDirection: 'row',
    width: '75%',
    minHeight: 550,
    alignSelf: 'center',
    maxWidth: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
    overflow: 'hidden',
    // Add vertical margin so it doesn't touch screen edges on small phones
    marginVertical: 40,
    elevation: 10,
  },
  loginContainerMobile: {
    flexDirection: 'column',
    width: '92%',
    minHeight: 650,
    marginVertical: 20,
  },
  leftPanel: {
    // flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  leftPanelMobile: {
    flex: 0,
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
    color: '#1A202C',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  leftTitleMobile: {
    fontSize: 20,
  },
  leftSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 50,
    justifyContent: 'center',
  },
  rightPanelMobile: {
    padding: 20,
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
  },
  welcome: {
    color: '#1A202C',
    fontSize: 24,
    fontWeight: '600',
  },
  welcomeMobile: {
    fontSize: 22,
  },
  signInText: {
    color: '#4A5568',
    fontSize: 15,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    color: '#4A5568',
    marginTop: 0,
  },
  platformIcons: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  platformText: {
    color: '#4A5568',
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  forgotPasswordText: {
    color: '#0072ff',
    fontWeight: '500',
    fontSize: 14,
  },
});
