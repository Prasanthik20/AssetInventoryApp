import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppSnackbar from '../../components/common/AppSnackbar';
import { baseURL, RootStackParamList } from "../../navigation/types";
import { Ionicons } from "@expo/vector-icons";

export default function AddCompanyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobileLayout = Platform.OS !== 'web' || width < 768;

  // Organization Details
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Primary User Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const handleRegister = async () => {
    // Basic validation
    if (!orgName || !fullName || !email || !password || !confirmPassword) {
      showSnackbar("Please fill all mandatory fields (Org Name, Full Name, Email, Password)", 'error');
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Passwords do not match!", 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${baseURL}/api/auth/register-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: {
            name: orgName,
            type: orgType,
            institutionId,
            gst: gstNumber,
            address,
            country,
            state,
            city,
            postalCode
          },
          user: {
            fullName,
            email,
            mobileNumber,
            designation,
            password
          }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar("Organization registered successfully!", 'success');
        setTimeout(async () => {
          try {
            const userData = await AsyncStorage.getItem("user");
            const currentUser = userData ? JSON.parse(userData) : null;
            if (currentUser && (currentUser.roleName === 'Super Admin' || currentUser.role === 'Super Admin')) {
              navigation.navigate('SuperAdminDashboard' as any);
            } else {
              navigation.navigate('CompanyLogin');
            }
          } catch (e) {
            navigation.navigate('CompanyLogin');
          }
        }, 2000);
      } else {
        showSnackbar(result.message || "Registration failed", 'error');
      }
    } catch (error) {
      console.error("Registration Error:", error);
      showSnackbar("Network error occurred. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/Company-bg.webp")}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={10}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, width: '100%' }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.formCard, isMobileLayout && { width: "100%" }]}>
                <Text style={styles.header}>🏢 SaaS Organization Registration</Text>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Organization Details</Text>
                  <View style={styles.divider} />
                </View>

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="Organization Name *" value={orgName} onChange={setOrgName} placeholder="Enter org name" isMobileLayout={isMobileLayout} />
                  <Input label="Organization Type" value={orgType} onChange={setOrgType} placeholder="e.g. Hospital, Corporate" isMobileLayout={isMobileLayout} />
                </View>

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="Institution ID (Opt)" value={institutionId} onChange={setInstitutionId} placeholder="Enter ID" isMobileLayout={isMobileLayout} />
                  <Input label="GST Number (Opt)" value={gstNumber} onChange={setGstNumber} placeholder="Enter GST" isMobileLayout={isMobileLayout} />
                </View>

                <Input label="Address" value={address} onChange={setAddress} placeholder="Enter full address" multiline isMobileLayout={isMobileLayout} />

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="Country" value={country} onChange={setCountry} placeholder="India" isMobileLayout={isMobileLayout} />
                  <Input label="State" value={state} onChange={setState} placeholder="Enter state" isMobileLayout={isMobileLayout} />
                </View>

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="City" value={city} onChange={setCity} placeholder="Enter city" isMobileLayout={isMobileLayout} />
                  <Input label="Postal Code" value={postalCode} onChange={setPostalCode} placeholder="Enter code" keyboardType="numeric" isMobileLayout={isMobileLayout} />
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Primary Admin User</Text>
                  <View style={styles.divider} />
                </View>

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="Full Name *" value={fullName} onChange={setFullName} placeholder="Enter full name" isMobileLayout={isMobileLayout} />
                  <Input label="Designation" value={designation} onChange={setDesignation} placeholder="e.g. IT Manager" isMobileLayout={isMobileLayout} />
                </View>

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="Email Address *" value={email} onChange={setEmail} placeholder="admin@org.com" keyboardType="email-address" isMobileLayout={isMobileLayout} />
                  <Input label="Mobile Number" value={mobileNumber} onChange={setMobileNumber} placeholder="Enter mobile" keyboardType="phone-pad" isMobileLayout={isMobileLayout} />
                </View>

                <View style={[styles.row, isMobileLayout && { flexDirection: 'column' }]}>
                  <Input label="Password *" value={password} onChange={setPassword} placeholder="••••••••" secureTextEntry isMobileLayout={isMobileLayout} />
                  <Input label="Confirm Password *" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" secureTextEntry isMobileLayout={isMobileLayout} />
                </View>

                <View style={[styles.buttonRow, isMobileLayout && { flexDirection: 'column' }]}>
                  <TouchableOpacity
                    style={[styles.createButton, isMobileLayout && { width: '100%' }]}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={["#0EA5E9", "#0F766E"]}
                      style={styles.createGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.createText}>REGISTER & ACTIVATE TRIAL</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CompanyLogin')}
                    style={[styles.cancelButton, isMobileLayout && { width: '100%' }]}
                  >
                    <LinearGradient
                      colors={["#235972ff", "#3aaca2ff"]}
                      style={styles.createGradient}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
      <AppSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        kind={snackbar.kind}
        onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        bottom={16}
      />
    </ImageBackground>
  );
}

const Input = ({ label, value, onChange, placeholder, isMobileLayout, ...props }: any) => (
  <View style={[styles.inputContainer, !isMobileLayout ? { flex: 1 } : { width: '100%', marginHorizontal: 0 }]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.5)"
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1, backgroundColor: '#071425' },
  container: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
  },
  scrollContainer: { padding: 20, alignItems: "center" },
  formCard: {
    width: Platform.OS === 'web' ? "80%" : "100%",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 25,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#00c6ff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  row: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-between",
  },
  inputContainer: {
    marginHorizontal: 5,
    marginVertical: 10,
  },
  label: {
    color: "#eee",
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
    buttonRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: Platform.OS === "web" ? "space-between" : "flex-end",
    marginTop: 10,
    gap: 15,
  },
  cancelButton: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 15,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cancelText: {
    color: "#fff",
    fontWeight: "600",
  },
  createButton: {
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 100,
  },
  backButton: {
    padding: 5,
  },
  createGradient: {
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignItems: "center",
  },
  createText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
