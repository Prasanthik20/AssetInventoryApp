import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Checkbox from "expo-checkbox";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import axios from 'axios';

export type RootStackParamList = {
  CompanyLogin: undefined;
  CompanyDashboard: undefined;
  SupervisorDashboard: undefined;
  OperatorDashboard : undefined;
  SuperAdminLogin: undefined;
};

type CompanyLoginNavigationProp = StackNavigationProp<RootStackParamList, 'CompanyLogin'>;


export default function CompanyLoginScreen() {
  const navigation = useNavigation<CompanyLoginNavigationProp>();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password.");
            return;
        }
        
        try {
            // Call your Next.js API endpoint
            // For mobile development, you must use your computer's IP address, not 'localhost'
            const response : any= await axios.post('http://localhost:3000/api/auth/login', {
                  // Data Payload
                    email: email,
                    password: password,
                },
                { // Configuration Object (for headers, etc.)
                 headers: { 
                        'Content-Type': 'application/json' 
                    },}
            );

            // The request was successful (status 200)
            const  role  = response.data.user.roleName;
            Alert.alert("Login Successful", `Welcome, ${role}!`);

            // Navigate based on the role received from the backend
            if (role === 'Admin') {
                navigation.navigate("CompanyDashboard");
            } else if (role === 'Supervisor') {
                navigation.navigate("SupervisorDashboard");
            } else if (role === 'Operator') {
                navigation.navigate("OperatorDashboard");
            } else {
                // Handle other roles or default case
                navigation.navigate("CompanyLogin");
            }

        } catch (error) {
            // Handle errors from the API (e.g., status 401 for bad credentials)
            if (axios.isAxiosError(error) && error.response) {
                Alert.alert("Login Failed", error.response.data.message || "An error occurred.");
            } else {
                Alert.alert("Connection Error", "Could not connect to the server.");
            }
            console.error("Login failed:", error);
        }
    };

  return (
    <ImageBackground
      source={require("../../assets/Company-bg.webp")}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loginContainer}>
            {/* Left Decorative Panel */}
            <View style={styles.leftPanel}>
                <Image 
                    source={require("../../assets/Asq_Logo_IV.png")}
                    style={styles.image}
                />
                <Text style={styles.leftTitle}>A SQUARE TECHNOLOGIES</Text>
                <Text style={styles.leftSubtitle}>SECURE ASSETFLOW</Text>
            </View>

            {/* Right Form Panel */}
            <View style={styles.rightPanel}>
                <View style={styles.logoContainer}>
                    <Image
                    source={require("../../assets/Login_logo.jpg")}
                    style={styles.logo}
                    />
                    <Text style={styles.welcome}>Welcome !</Text>
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

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                {/* <View style={styles.rememberRow}>
                    <Checkbox value={remember} onValueChange={setRemember} color="#0072ff" />
                    <Text style={styles.rememberText}>Remember me</Text>
                </View> */}

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                    <LinearGradient
                    colors={["#00c6ff", "#0072ff"]}
                    style={styles.buttonGradient}
                    >
                    <Text style={styles.loginText}>LOG IN</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                        style={{ marginTop: 20 }}
                        onPress={() => navigation.navigate("SuperAdminLogin")}
                        >
                        <Text style={styles.linkText}>
                            Login as <Text style={{ fontWeight: "bold", color: "#0072ff" }}>Super Admin</Text>
                        </Text>
                    </TouchableOpacity>

                <View style={styles.platformIcons}>
                    <Text style={styles.platformText}>🌐 Web   📱 Android   🍎 iOS</Text>
                </View>
            </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// --- STYLES COMPLETELY REVISED TO MATCH THE NEW IMAGE ---
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    safeArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loginContainer: {
        flexDirection: 'row',
        width: "80%",
        maxWidth: 900,
        height: '70%',
        maxHeight: 550,
        // --- MODIFICATION: Increased transparency for "frosted glass" effect ---
        backgroundColor: "rgba(255, 255, 255, 0.35)",
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    leftPanel: {
        flex: 1, // Let flexbox decide the size
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        padding: 25,
        // --- MODIFICATION: Removed border for a seamless look ---
    },
    image: {
        width: 300,
        height: 150,
        marginBottom: 20,
        resizeMode: 'contain',
    },
    leftTitle: {
        fontSize: 26,
        color: "#1A202C",
        fontWeight: "bold",
    },
    leftSubtitle: {
        fontSize: 14,
        color: "#4A5568",
        marginTop: 5,
    },
    rightPanel: {
        flex: 1, // Let flexbox decide the size
        backgroundColor: "transparent",
        padding: 40,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 25,
    },
    logo: {
        width: 80,
        height: 70,
        marginBottom: 10,
        borderRadius: 8,
    },
    welcome: {
        color: "#1A202C",
        fontSize: 24,
        fontWeight: "600",
    },
    signInText: {
        color: "#4A5568",
        fontSize: 15,
        marginTop: 2,
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 14,
        marginBottom: 15,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        color: "#1A202C",
    },
    rememberRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    rememberText: {
        color: "#2D3748",
        marginLeft: 8,
        fontWeight: '500',
    },
    loginButton: {
        borderRadius: 10,
        overflow: "hidden",
        elevation: 5,
    },
    buttonGradient: {
        paddingVertical: 15,
        alignItems: "center",
    },
    loginText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    linkText: {
        textAlign: "center",
        color: "#4A5568",
    },
    platformIcons: {
        alignItems: "center",
        marginTop: 'auto',
        paddingTop: 20,
    },
    platformText: {
        color: "#4A5568",
        fontSize: 14,
    },
});