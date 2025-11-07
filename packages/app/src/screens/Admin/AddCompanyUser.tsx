import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Image, Switch, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // Using Expo icons
import { useNavigation } from "@react-navigation/native"; 

const AddCompanyUser: React.FC = () => {
    const navigation = useNavigation();
  const [role, setRole] = useState<'Supervisor' | 'Operator'>('Supervisor');
  const [isEnabled, setIsEnabled] = useState(true);
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  return (
    <ImageBackground
      source={require("../../assets/Company-bg.webp")} // Using the same background
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
              {/* Left Panel */}
              <View style={styles.leftPanel}>
                  <Image
                      // --- FIXED IMAGE ---
                      // Replaced the broken imgur link with a new, working placeholder.
                      // For production, it's best to save this image locally in your assets folder.
                      source={{ uri: 'https://static.vecteezy.com/system/resources/previews/011/944/119/original/3d-render-isometric-illustration-of-data-analytics-and-business-finance-report-concept-png.png' }}
                      style={styles.leftPanelImage}
                  />
                  <Text style={styles.leftPanelTitle}>ADD NEW TEAM MEMBER</Text>
                  <Text style={styles.leftPanelSubtitle}>CECESTLOW</Text>
              </View>

              {/* Right Panel */}
              <View style={styles.rightPanel}>
                  {/* Top Bar */}
                  <View style={styles.topBar}>
                      <Text style={styles.formTitle}>Add/Manage User</Text>
                      <View style={styles.topBarIcons}>
                          <Feather name="user" size={16} color="#555" />
                          <Text style={styles.topBarText}>Admin</Text>
                          <Feather name="settings" size={16} color="#555" style={{marginLeft: 15}} />
                      </View>
                  </View>

                  {/* Form Inputs */}
                  <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" />
                  <TextInput style={styles.input} placeholder="Work Email" placeholderTextColor="#999" keyboardType="email-address" />
                  <TextInput style={styles.input} placeholder="Set Password" placeholderTextColor="#999" secureTextEntry />
                  <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#999" keyboardType="phone-pad" />

                  {/* Role Assignment & Toggle */}
                  <View style={styles.assignRoleContainer}>
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
                      <Switch
                          trackColor={{ false: "#E9E9EA", true: "#34C759" }}
                          thumbColor={"#f4f3f4"}
                          onValueChange={toggleSwitch}
                          value={isEnabled}
                          style={{ transform: [{ scaleX: .8 }, { scaleY: .8 }] }} // Slightly smaller switch
                      />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity>
                          <LinearGradient
                              colors={['#27B2C3', '#40D69B']} // Refined gradient
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.createButton}
                          >
                              <Text style={styles.createButtonText}>ADD USER</Text>
                          </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate("CompanyDashboard" as never)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                  </View>

                  {/* Bottom Navigation
                  <View style={styles.bottomNav}>
                    <TouchableOpacity style={styles.navItem}>
                        <MaterialCommunityIcons name="web" size={24} color="#555" />
                        <Text style={styles.navText}>Web</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="people-outline" size={24} color="#555" />
                        <Text style={styles.navText}>Users</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <MaterialCommunityIcons name="file-chart-outline" size={24} color="#555" />
                        <Text style={styles.navText}>Reports</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="settings-outline" size={24} color="#555" />
                        <Text style={styles.navText}>Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <MaterialCommunityIcons name="cellphone" size={24} color="#555" />
                        <Text style={styles.navText}>iOS</Text>
                    </TouchableOpacity>
                  </View> */}
              </View>
          </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: "100%",
    height: "100%",
    },
    safeArea: {
        flex: 1,
    },
    // Renamed 'addUserCard' to 'container'
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        width: '40%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    leftPanelImage: {
        width: 220,
        height: 220,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    leftPanelTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    leftPanelSubtitle: {
        fontSize: 18,
        color: '#fff',
        opacity: 0.8,
    },
    rightPanel: {
        flex: 1,
        // Made background semi-transparent
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        padding: 30,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A202C',
    },
    topBarIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        // Made background semi-transparent
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    topBarText: {
        marginLeft: 5,
        color: '#2D3748',
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        // Made background semi-transparent but still readable
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 15,
        fontSize: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        color: '#1A202C',
    },
    assignRoleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
        marginTop: 10,
    },
    assignRoleTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3748',
    },
    roleSelection: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'center',
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    radioOuter: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    radioInner: {
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
    },
    roleText: {
        fontSize: 14,
        color: '#1A202C',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    createButton: {
        paddingVertical: 16,
        paddingHorizontal: 35,
        borderRadius: 12,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    cancelButton: {
        marginLeft: 30,
    },
    cancelText: {
        fontSize: 15,
        color: '#4A5568',
        fontWeight: '600',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        // Made background semi-transparent
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 18,
        paddingVertical: 12,
        marginTop: 'auto',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.7)',
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 11,
        color: '#4A5568',
        marginTop: 2,
    },
});

export default AddCompanyUser;