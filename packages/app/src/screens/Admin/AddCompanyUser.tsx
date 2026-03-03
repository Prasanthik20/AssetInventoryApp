import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    SafeAreaView, Image, ImageBackground, Platform, ScrollView, Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons'; 
import { useNavigation } from "@react-navigation/native"; 
import axios from 'axios';
import { baseURL } from '../../navigation/types';

const AddCompanyUser: React.FC = () => {
    const navigation = useNavigation();
    const isWeb = Platform.OS === 'web';

    // Prisma Schema States
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    //const [photoURL, setPhotoURL] = useState('');
    const [role, setRole] = useState<'Supervisor' | 'Operator'>('Supervisor');
    const [loading, setLoading] = useState(false);

  const handleAddUser = async () => {
  try {
    setLoading(true);
    const payload = {
      fullName,
      email,
      password,
      phoneNumber,
      address,
     // photoURL,
      roleName: role
    };

    // Use kebab-case to match your file name: add-user.ts
    const response = await axios.post(
      `${baseURL}/api/auth/addUser`, 
      payload
    );

    if (response.status === 201) {
      alert("User Added Successfully");
      navigation.goBack();
    }
  } catch (error: any) { // ': any' fixes the 'unknown' type error
    console.error("Axios add-user error:", error.response?.status, error.response?.data);
    
    // If it's still 404, the file isn't where we think it is on the server
    const errorMessage = error.response?.data?.message || "Error: " + error.response?.status;
    alert(errorMessage);
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
                <View style={[styles.container, !isWeb && styles.mobileContainer]}>
                    
                    {/* 1. LEFT PANEL: Web Only */}
                    {isWeb && (
                        <View style={styles.leftPanel}>
                            <Image
                                source={{ uri: 'https://static.vecteezy.com/system/resources/previews/011/944/119/original/3d-render-isometric-illustration-of-data-analytics-and-business-finance-report-concept-png.png' }}
                                style={styles.leftPanelImage}
                            />
                            <Text style={styles.leftPanelTitle}>ADD NEW TEAM MEMBER</Text>
                            <Text style={styles.leftPanelSubtitle}>ASSETFLOW</Text>
                        </View>
                    )}

                    {/* 2. RIGHT PANEL (Form Area) */}
                    <ScrollView 
                        style={styles.mainScroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.rightPanel, !isWeb && styles.mobileRightPanel]}>
                            <View style={styles.topBar}>
                                <Text style={styles.formTitle}>User Information</Text>
                                <View style={styles.topBarIcons}>
                                    <Feather name="user-plus" size={16} color="#555" />
                                    <Text style={styles.topBarText}>Admin</Text>
                                </View>
                            </View>

                            <View style={styles.formContainer}>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Full Name" 
                                    placeholderTextColor="#999" 
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Work Email" 
                                    placeholderTextColor="#999" 
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Password" 
                                    placeholderTextColor="#999" 
                                    secureTextEntry 
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Phone Number" 
                                    placeholderTextColor="#999" 
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                                {/* <TextInput 
                                    style={styles.input} 
                                    placeholder="Photo URL" 
                                    placeholderTextColor="#999"
                                    value={photoURL}
                                    onChangeText={setPhotoURL}
                                /> */}
                                <TextInput 
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                    placeholder="Address" 
                                    placeholderTextColor="#999"
                                    multiline
                                    value={address}
                                    onChangeText={setAddress}
                                />

                                {/* Role Assignment */}
                                <View style={[styles.assignRoleContainer, !isWeb && styles.mobileRoleRow]}>
                                    <Text style={styles.assignRoleTitle}>Assign Role</Text>
                                    <View style={styles.roleSelection}>
                                        <TouchableOpacity style={styles.roleOption} onPress={() => setRole('Supervisor')}>
                                            <View style={styles.radioOuter}>
                                                {role === 'Supervisor' && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={styles.roleText}>Supervisor</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.roleOption} onPress={() => setRole('Operator')}>
                                            <View style={styles.radioOuter}>
                                                {role === 'Operator' && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={styles.roleText}>Operator</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={[styles.actionButtonsContainer, !isWeb && styles.mobileActionButtons]}>
                                    <TouchableOpacity 
                                        style={!isWeb && { width: '100%' }} 
                                        onPress={handleAddUser}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={['#27B2C3', '#40D69B']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={[styles.createButton, loading && { opacity: 0.7 }]}
                                        >
                                            <Text style={styles.createButtonText}>
                                                {loading ? "CREATING..." : "ADD USER"}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.cancelButton, !isWeb && styles.mobileCancelBtn]} 
                                        onPress={() => navigation.goBack()}
                                    >
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: "100%", height: "100%" },
    safeArea: { flex: 1, backgroundColor: "rgba(61, 138, 233, 0.4)" },
    container: { flex: 1, flexDirection: 'row' },
    mobileContainer: { flexDirection: 'column' },
    mainScroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    
    // Left Panel
    leftPanel: { width: '40%', justifyContent: 'center', alignItems: 'center', padding: 20 },
    leftPanelImage: { width: 220, height: 220, resizeMode: 'contain', marginBottom: 20 },
    leftPanelTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    leftPanelSubtitle: { fontSize: 18, color: '#fff', opacity: 0.8 },
    
    // Right Panel
    rightPanel: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', padding: 30 },
    mobileRightPanel: { 
        margin: 15, 
        borderRadius: 25, 
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        padding: 20,
        marginTop: 50
    },
    
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
    topBarIcons: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    topBarText: { marginLeft: 5, color: '#2D3748', fontSize: 14, fontWeight: '600' },
    
    formContainer: { width: '100%' },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        color: '#1A202C',
    },
    assignRoleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 15 },
    mobileRoleRow: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
    
    assignRoleTitle: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
    roleSelection: { flexDirection: 'row' },
    roleOption: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    radioOuter: { height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    radioInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#007AFF' },
    roleText: { fontSize: 14, color: '#1A202C' },
    
    actionButtonsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 30 },
    mobileActionButtons: { flexDirection: 'column-reverse', gap: 15 },
    
    createButton: { paddingVertical: 16, paddingHorizontal: 35, borderRadius: 12, alignItems: 'center' },
    createButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    cancelButton: { marginLeft: 30 },
    mobileCancelBtn: { marginLeft: 0 },
    cancelText: { fontSize: 15, color: '#4A5568', fontWeight: '600' },
});

export default AddCompanyUser;