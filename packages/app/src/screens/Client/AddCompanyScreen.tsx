import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppSnackbar from '../../components/common/AppSnackbar';
import { baseURL, RootStackParamList } from "../../navigation/types";

export default function AddCompanyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);

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
        setTimeout(() => {
          navigation.navigate('CompanyLogin');
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
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.header}>🏢 SaaS Organization Registration</Text>
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Organization Details</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.row}>
              <Input label="Organization Name *" value={orgName} onChange={setOrgName} placeholder="Enter org name" />
              <Input label="Organization Type" value={orgType} onChange={setOrgType} placeholder="e.g. Hospital, Corporate" />
            </View>

            <View style={styles.row}>
              <Input label="Institution ID (Opt)" value={institutionId} onChange={setInstitutionId} placeholder="Enter ID" />
              <Input label="GST Number (Opt)" value={gstNumber} onChange={setGstNumber} placeholder="Enter GST" />
            </View>

            <Input label="Address" value={address} onChange={setAddress} placeholder="Enter full address" multiline />

            <View style={styles.row}>
              <Input label="Country" value={country} onChange={setCountry} placeholder="India" />
              <Input label="State" value={state} onChange={setState} placeholder="Enter state" />
            </View>

            <View style={styles.row}>
              <Input label="City" value={city} onChange={setCity} placeholder="Enter city" />
              <Input label="Postal Code" value={postalCode} onChange={setPostalCode} placeholder="Enter code" keyboardType="numeric" />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Primary Admin User</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.row}>
              <Input label="Full Name *" value={fullName} onChange={setFullName} placeholder="Enter full name" />
              <Input label="Designation" value={designation} onChange={setDesignation} placeholder="e.g. IT Manager" />
            </View>

            <View style={styles.row}>
              <Input label="Email Address *" value={email} onChange={setEmail} placeholder="admin@org.com" keyboardType="email-address" />
              <Input label="Mobile Number" value={mobileNumber} onChange={setMobileNumber} placeholder="Enter mobile" keyboardType="phone-pad" />
            </View>

            <View style={styles.row}>
              <Input label="Password *" value={password} onChange={setPassword} placeholder="••••••••" secureTextEntry />
              <Input label="Confirm Password *" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" secureTextEntry />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleRegister}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#00c6ff", "#0072ff"]}
                  style={styles.createGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createText}>REGISTER & ACTIVATE TRIAL</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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

const Input = ({ label, value, onChange, placeholder, ...props }: any) => (
  <View style={styles.inputContainer}>
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
  container: { flex: 1 },
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
    flex: 1,
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
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 30,
    gap: 15,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    justifyContent: 'center',
  },
  cancelText: {
    color: "#fff",
    fontWeight: "600",
  },
  createButton: {
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 200,
  },
  createGradient: {
    paddingVertical: 14,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  createText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
