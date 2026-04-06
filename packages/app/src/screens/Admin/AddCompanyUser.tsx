import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    SafeAreaView, ImageBackground, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons'; 
import { useNavigation } from "@react-navigation/native"; 
import axios from 'axios';
import { baseURL } from '../../navigation/types';
import { globalColors } from 'src/styles/globalStyles';

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
                    {/* Form Area */}
                    <ScrollView 
                        style={styles.mainScroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.rightPanel, !isWeb && styles.mobileRightPanel]}>
                            <View style={styles.topBar}>
                                <Text style={styles.formTitle}>User Information</Text>
                                <View style={styles.topBarIcons}>
                                    <Feather name="user-plus" size={16} color="#A9C6E4" />
                                    <Text style={styles.topBarText}>Admin</Text>
                                </View>
                            </View>

                            <View style={styles.formContainer}>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Full Name" 
                                    placeholderTextColor="#7FA2C8" 
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Work Email" 
                                    placeholderTextColor="#7FA2C8" 
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Password" 
                                    placeholderTextColor="#7FA2C8" 
                                    secureTextEntry 
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Phone Number" 
                                    placeholderTextColor="#7FA2C8" 
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
                                    placeholderTextColor="#7FA2C8"
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
                                            colors={['#0EA5E9', '#0F766E']}
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
    safeArea: { flex: 1, backgroundColor: '#071425' },
    container: {
        flex: 1,
        backgroundColor: 'rgba(7, 24, 42, 0.82)',
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    mobileContainer: { flexDirection: 'column' },
    mainScroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
 
    // Right Panel
    rightPanel: {
        flex: 1,
        backgroundColor: 'rgba(7, 24, 42, 0.9)',
        padding: 24,
    },
    mobileRightPanel: { 
        margin: 15, 
        borderRadius: 25, 
        backgroundColor: 'rgba(7, 24, 42, 0.92)',
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
        padding: 20,
        marginTop: 20
    },
    
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    formTitle: { fontSize: 22, fontWeight: 'bold', color: '#E6F3FF' },
    topBarIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
    },
    topBarText: { marginLeft: 5, color: '#A9C6E4', fontSize: 14, fontWeight: '600' },
    
    formContainer: { width: '100%' },
    input: {
        backgroundColor: 'rgba(18, 45, 73, 0.86)',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(159, 207, 255, 0.22)',
        color: '#E6F3FF',
    },
    assignRoleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 15 },
    mobileRoleRow: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
    
    assignRoleTitle: { fontSize: 16, fontWeight: '600', color: '#A9C6E4' },
    roleSelection: { flexDirection: 'row' },
    roleOption: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    radioOuter: { height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: '#22D3EE', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    radioInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#22D3EE' },
    roleText: { fontSize: 14, color: '#E6F3FF' },
    
    actionButtonsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 30 },
    mobileActionButtons: { flexDirection: 'column-reverse', gap: 15 },
    
    createButton: { paddingVertical: 16, paddingHorizontal: 35, borderRadius: 12, alignItems: 'center' },
    createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
    cancelButton: { marginLeft: 30 },
    mobileCancelBtn: { marginLeft: 0 },
    cancelText: { fontSize: 15, color: '#A9C6E4', fontWeight: '600' },
});

export default AddCompanyUser;