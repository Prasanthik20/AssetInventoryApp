import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

export default function AddCompanyScreen() {
    const navigation = useNavigation();
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [autoAssignAdmin, setAutoAssignAdmin] = useState(false);
  const [subscription, setSubscription] = useState("Basic");

  const handleCreateCompany = () => {
    if (!companyName || !email || !password) {
      Alert.alert("Missing Info", "Please fill all required fields!");
      return;
    }
    Alert.alert(
      "Company Created",
      `✅ ${companyName} has been activated with ${subscription} plan.`
    );
  };

  return (
    <ImageBackground
          source={require("../../assets/Company-bg.webp")}
          style={styles.backgroundImage}
          resizeMode="cover"
          blurRadius={5}
        >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formCard}>
            <Text style={styles.header}>New Company Registration</Text>

            {/* Row 1 */}
            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>🏢 Company Name</Text>
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Enter company name"
                  placeholderTextColor="#000000ff"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>📧 Contact Person</Text>
                <TextInput
                  style={styles.input}
                  value={contactPerson}
                  onChangeText={setContactPerson}
                  placeholder="Enter contact person"
                  placeholderTextColor="#000000ff"
                />
              </View>
            </View>

            {/* Row 2 */}
            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>✉️ Work Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="company@email.com"
                  keyboardType="email-address"
                  placeholderTextColor="#000000ff"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>📋 Subscription Plan</Text>
                <TextInput
                  style={styles.input}
                  value={subscription}
                  onChangeText={setSubscription}
                  placeholder="Basic / Pro / Enterprise"
                  placeholderTextColor="#000000ff"
                />
              </View>
            </View>

            {/* Row 3 */}
            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>🔑 Admin Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter admin password"
                  placeholderTextColor="#000000ff"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>🔒 Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#000000ff"
                />
              </View>
            </View>

            {/* Switch Row */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Auto-Assign Company Admin</Text>
              {/* <Switch
                value={autoAssignAdmin}
                onValueChange={setAutoAssignAdmin}
                thumbColor={autoAssignAdmin ? "#00C6FF" : "#ccc"}
              /> */}
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateCompany}
              >
                <LinearGradient
                  colors={["#00c6ff", "#0072ff"]}
                  style={styles.createGradient}
                >
                  <Text style={styles.createText}>CREATE COMPANY & ACTIVATE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footerText}>🌐 Web   🧑‍💼 Companies   ⚙️ Settings   🍎 iOS</Text>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1 ,
    width: '100%',
    height: '100%'
  },
  container: { flex: 1,backgroundColor: "rgba(61, 138, 233, 0.4)" },
  scrollContainer: { padding: 20, alignItems: "center" },
  formCard: {
    width: "95%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000ff",
    textAlign: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-between",
  },
  inputContainer: {
    flex: 1,
    margin: 8,
  },
  label: {
    color: "#000000ff",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 10,
    color: "#000000ff",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  switchLabel: {
    color: "#000000ff",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 8,
  },
  cancelText: {
    color: "#000000ff",
    fontWeight: "600",
  },
  createButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  createGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  createText: {
    color: "#000000ff",
    fontWeight: "bold",
  },
  footerText: {
    color: "#000000ff",
    opacity: 0.8,
    fontSize: 13,
    marginTop: 30,
  },
});