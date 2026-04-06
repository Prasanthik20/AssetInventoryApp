import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import axios from "axios";
import { RootStackParamList, baseURL } from "../../navigation/types";
import { Feather } from '@expo/vector-icons';
import AppSnackbar from 'src/components/common/AppSnackbar';

type Props = StackScreenProps<RootStackParamList, "ResetPassword">;

export default function ResetPassword({ route, navigation }: Props) {
  const { token } = route.params;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      showSnackbar("Please fill all fields.", 'error');
      return;
    }

    if (password.length < 6) {
      showSnackbar("Password must be at least 6 characters.", 'error');
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Passwords do not match.", 'error');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${baseURL}/api/auth/reset-password`,
        {
          token,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      showSnackbar(response.data.message || "Password reset successful!", 'success');
      setTimeout(() => {
        navigation.navigate("CompanyLogin");
      }, 900);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        showSnackbar(error.response.data.message || "Reset failed.", 'error');
      } else {
        showSnackbar("Server connection failed.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, isMobileLayout && styles.containerMobile]}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below
          </Text>

          <View style={styles.passwordFieldContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="New Password"
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

          <View style={styles.passwordFieldContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Feather
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={18}
                color="#475569"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <LinearGradient
              colors={["#00c6ff", "#0072ff"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {loading ? "Resetting..." : "RESET PASSWORD"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <AppSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        kind={snackbar.kind}
        onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        bottom={isMobileLayout ? 16 : 20}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
  },
  container: {
    width: 400,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    padding: 30,
    borderRadius: 20,
    elevation: 5,
  },
  containerMobile: {
    width: '92%',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#1A202C",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  button: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});