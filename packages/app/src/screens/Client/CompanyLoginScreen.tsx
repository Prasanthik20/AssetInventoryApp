import React, { useState } from "react";
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
    Dimensions,
    Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Checkbox from "expo-checkbox";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import axios from 'axios';
import { baseURL } from "src/navigation/types";

const { width, height } = Dimensions.get('window');
const isMobileDevice = Platform.OS !== 'web';

export type RootStackParamList = {
    CompanyLogin: undefined;
    CompanyDashboard: {
        adminName: string;
        adminImage: string | null;
        roleName: string;
    };
    SupervisorDashboard: {
        supervisorName: string;
        roleName: string;
        employeeId: string;
    }
    OperatorDashboard: {
        operatorName: string;
        roleName: string;
        employeeId: string;
    }
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
            const response: any = await axios.post(`${baseURL}/api/auth/login`, {
                // Data Payload
                email: email,
                password: password,
            },
                { // Configuration Object (for headers, etc.)
                    headers: {
                        'Content-Type': 'application/json'
                    },
                }
            );

            // The request was successful (status 200)
            const role = response.data.user.roleName;
            Alert.alert("Login Successful", `Welcome, ${role}!`);

            // Navigate based on the role received from the backend
            if (role === 'Admin') {
                navigation.navigate("CompanyDashboard", {
                    adminName: response.data.user.fullName,
                    adminImage: response.data.user.photoURL,
                    roleName: response.data.user.roleName,
                });
            } else if (role === 'Supervisor') {
                navigation.navigate("SupervisorDashboard", {
                    supervisorName: response.data.user.fullName,
                    roleName: response.data.user.roleName,
                    employeeId: response.data.user.employeeId,
                });
            } else if (role === 'Operator') {
                navigation.navigate("OperatorDashboard", {
                    operatorName: response.data.user.fullName,
                    roleName: response.data.user.roleName,
                    employeeId: response.data.user.employeeId,
                });
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
              <KeyboardAvoidingView
                // Use 'padding' for iOS and 'height' for Android to handle the keyboard correctly
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1, width: '100%' }}
            >
                <ScrollView
                    // flexGrow: 1 allows content to center when small, but scroll when keyboard opens
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
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
                        {/* <KeyboardAvoidingView
                            behavior={Platform.OS === "android" ? "height" : "padding"}
                            style={{ flex: 1 }}
                        > */}
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
        width: "100%",
        height: "100%",
    },
    safeArea: {
        flex: 1,
        backgroundColor: "rgba(61, 138, 233, 0.4)"
    },
    loginContainer: {
        flexDirection: isMobileDevice ? 'column' : 'row', 
        width: isMobileDevice ? "90%" : "75%",
        // Key Fix: Do not set a fixed height on mobile. Let it grow.
        minHeight: isMobileDevice ? 650 : 550, 
        alignSelf: 'center',
        maxWidth: 1000, 
        backgroundColor: "rgba(255, 255, 255, 0.8)", 
        borderRadius: 30,
        overflow: 'hidden',
        // Add vertical margin so it doesn't touch screen edges on small phones
        marginVertical: 40,
        elevation: 10,
    },
    leftPanel: {
        // In mobile view, don't use 'flex: 1' or it will push the form off-screen
        flex: isMobileDevice ? 0 : 1.2, 
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    image: {
       width: isMobileDevice ? 200 : 300, 
        height: isMobileDevice ? 80 : 150,
        resizeMode: 'contain',
    },
    leftTitle: {
        fontSize: isMobileDevice ? 20 : 26,
        color: "#1A202C",
        fontWeight: "bold",
        textAlign: 'center',
        letterSpacing: 1,
    },
    leftSubtitle: {
        fontSize: 16,
        color: "#64748b",
        marginTop: 8,
        fontWeight: "500",
    },
    rightPanel: {
     flex: 1,
        backgroundColor: "#ffffff",
        padding: isMobileDevice ? 20 : 50,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: isMobileDevice ? 15 : 25,
    },
    logo: {
        width: isMobileDevice ? 60 : 80,
        height: isMobileDevice ? 50 : 70,
        marginBottom: 10,
        borderRadius: 8,
    },
    welcome: {
        color: "#1A202C",
        fontSize: isMobileDevice ? 22 : 24,
        fontWeight: "600",
    },
    signInText: {
        color: "#4A5568",
        fontSize: 15,
        marginTop: 2,
    },
    input: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
        marginTop: isMobileDevice ? 15 : 0,
    },
    platformIcons: {
        alignItems: "center",
        marginTop: isMobileDevice ? 20 : 'auto',
        paddingTop: 20,
    },
    platformText: {
        color: "#4A5568",
        fontSize: 14,
    },
});