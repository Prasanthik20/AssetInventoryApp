import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    SafeAreaView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ImageBackground,
    ScrollView,
} from "react-native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { baseURL, RootStackParamList } from "../../navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const isMobileDevice = Platform.OS !== "web";

type ForgotPasswordNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ForgotPassword"
>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<ForgotPasswordNavigationProp>();

    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!email || !newPassword || !confirmPassword) {
            Alert.alert("Error", "All fields are required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${baseURL}/api/auth/forgot-password`,
                {
                    email,
                    newPassword,
                    confirmPassword,
                }
            );

            setSuccessMessage("Password updated successfully! Redirecting...");

            setTimeout(() => {
                navigation.replace("CompanyLogin");
            }, 1500);
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                Alert.alert(
                    "Error",
                    error.response.data.message || "Request failed."
                );
            } else {
                Alert.alert("Error", "Server connection failed.");
            }
        } finally {
            setLoading(false);
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
                    <View style={styles.rightPanel}>
                                {successMessage !== "" && (
                                    <View style={styles.successBox}>
                                        <Text style={styles.successText}>{successMessage}</Text>
                                    </View>
                                )}
                                { }
                            <Text style={styles.title}>Change Password</Text>
                            <Text style={styles.subtitle}>
                                Enter your email and set a new password
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#94a3b8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="New Password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="Confirm Password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />

                            <TouchableOpacity
                                style={styles.buttonWrapper}
                                onPress={handleChangePassword}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={["#00c6ff", "#0072ff"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            CHANGE PASSWORD
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ marginTop: 20 }}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={styles.backText}>
                                    Back to Login
                                </Text>
                            </TouchableOpacity>
                        </View>
                    {/* </View> */}
                    </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

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
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 24,
//   },

//   card: {
//     width: isMobileDevice ? "100%" : 440,
//     backgroundColor: "rgba(255,255,255,0.95)",
//     paddingVertical: 40,
//     paddingHorizontal: 30,
//     borderRadius: 30,

//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 20 },
//     shadowOpacity: 0.25,
//     shadowRadius: 30,
//     elevation: 20,
//   },

  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#0f172a",
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: 35,
    fontSize: 15,
    lineHeight: 22,
  },

  input: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
    marginBottom: 18,
    color: "#0f172a",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
successBox: {
    backgroundColor: "#e6f9f0",
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    alignItems: "center",
},

successText: {
    color: "#16a34a",
    fontWeight: "600",
    fontSize: 14,
},
  buttonWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
  },

  button: {
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 20,
  },

  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 1.2,
  },

  backText: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 25,
  },
});