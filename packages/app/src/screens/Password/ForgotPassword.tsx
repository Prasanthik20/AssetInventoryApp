import React, { useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    SafeAreaView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
    ImageBackground,
    ScrollView,
} from "react-native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { baseURL, RootStackParamList } from "../../navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from '@expo/vector-icons';
import AppSnackbar from 'src/components/common/AppSnackbar';

type ForgotPasswordNavigationProp = StackNavigationProp<
    RootStackParamList,
    "ForgotPassword"
>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<ForgotPasswordNavigationProp>();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
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

    const handleChangePassword = async () => {
        if (!email || !newPassword || !confirmPassword) {
            showSnackbar("All fields are required.", 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showSnackbar("Passwords do not match.", 'error');
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
            showSnackbar("Password updated successfully! Redirecting...", 'success');

            setTimeout(() => {
                navigation.replace("CompanyLogin");
            }, 1500);
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                showSnackbar(error.response.data.message || "Request failed.", 'error');
            } else {
                showSnackbar("Server connection failed.", 'error');
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
                    <View style={[styles.loginContainer, isMobileLayout && styles.loginContainerMobile]}>
                                            {/* Left Decorative Panel */}
                                            <View style={[styles.leftPanel, isMobileLayout && styles.leftPanelMobile]}>
                                                <Image
                                                    source={require("../../assets/nscllp.png")}
                                                    style={[styles.image, isMobileLayout && styles.imageMobile]}
                                                />
                                                <Text style={[styles.leftTitle, isMobileLayout && styles.leftTitleMobile]}>A SQUARE TECHNOLOGIES</Text>
                                                <Text style={styles.leftSubtitle}>SECURE ASSETFLOW</Text>
                                            </View>
                    <View style={[styles.rightPanel, isMobileLayout && styles.rightPanelMobile]}>
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

                            <View style={styles.passwordFieldContainer}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="New Password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <Feather
                                      name={showNewPassword ? 'eye-off' : 'eye'}
                                      size={18}
                                      color="#475569"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.passwordFieldContainer}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#94a3b8"
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
    flex: 1,
    width: "100%",
    height: "100%",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "globalColors.backgroundSoft"
  },
   loginContainer: {
       flexDirection: 'row', 
       width: "75%",
       minHeight: 550,
        alignSelf: 'center',
        maxWidth: 1000, 
        backgroundColor: "rgba(255, 255, 255, 0.8)", 
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
                flex: 1.2,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
        leftPanelMobile: {
            flex: 0,
        },
    image: {
             width: 300,
                height: 150,
        resizeMode: 'contain',
    },
        imageMobile: {
            width: 200,
            height: 80,
        },
    leftTitle: {
                fontSize: 26,
        color: "#1A202C",
        fontWeight: "bold",
        textAlign: 'center',
        letterSpacing: 1,
    },
        leftTitleMobile: {
            fontSize: 20,
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
                padding: 50,
        justifyContent: 'center',
    },
        rightPanelMobile: {
            padding: 20,
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
    top: 16,
    padding: 2,
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