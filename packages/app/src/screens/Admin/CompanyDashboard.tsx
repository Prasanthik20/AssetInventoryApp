import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
// --- For Type Safety with React Navigation ---
import { StackNavigationProp } from '@react-navigation/stack';

// 1. Define your navigation routes, including the new asset screens
export type RootStackParamList = {
  CompanyDashboard: {
  adminName: string;
  adminImage: string | null;
  roleName: string;
};
  AddCompanyUser: undefined;
  TotalAssetDetails: undefined;
  CompanyUsersScreen : undefined;
  OfficeAssets: undefined;
  FieldAssets: undefined;
  // ... other screens in your app
};

// 2. Create a specific type for this screen's navigation prop
type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'CompanyDashboard'>;
type DashboardRoute = RouteProp<RootStackParamList, "CompanyDashboard">;

const CompanyDashboard: React.FC = () => {

    // 3. Use the strongly-typed navigation hook
    const navigation = useNavigation<DashboardNavigationProp>();
    const route = useRoute<DashboardRoute>();

    const { adminName, adminImage, roleName } = route.params;
    const [users, setUsers] = useState([]);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [officeAssets, setOfficeAssets] = useState<number | null>(null);
  const [fieldAssets, setFieldAssets] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);


const fetchUsers = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/auth/users");
    const data = await res.json();

    if (res.ok && Array.isArray(data.users)) {
      setUsers(data.users);
      setTotalUsers(data.count);
    } else {
      setUsers([]);
      console.error("Users API format error:", data);
    }
  } catch (error) {
    console.error("Users API Error:", error);
    setUsers([]);
  }
};

  // ------------------------------------
  // 📌 FETCH DASHBOARD METRICS FROM API
  // ------------------------------------
  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/dashboard"); // <-- change to your backend IP
      const data = await response.json();
      setTotalAssets(data.totalAssets);
      setOfficeAssets(data.officeAssets);   // FIXED
      setFieldAssets(data.fieldAssets);
    } catch (error) {
      console.log("Dashboard API Error:", error);
    } finally {
      setLoading(false);
    }
  };
 // -------------------------
  // 📌 RUN ON PAGE OPEN
  // -------------------------
  useEffect(() => {
  fetchUsers();
  fetchDashboardData();
}, []);


    return (
        <ImageBackground
            source={require("../../assets/Company-bg.webp")}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={5}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Left Panel */}
                    <View style={styles.leftPanel}>
                        <Image source={{ uri: adminImage || "https://i.imgur.com/6VBx3io.png",
                                        }}
                                style={{ width: 120, height: 120, borderRadius: 40 }}/>
  
                        <Text style={{ fontSize: 40, fontWeight: "bold", marginTop: 10 }}>
                                {adminName}
                        </Text>

                        <Text style={{ fontSize: 30, color: "gray" }}>
                                {roleName}
                        </Text>
                    </View>

                    {/* Right Panel */}
                    <View style={styles.rightPanel}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Dashboard</Text>
                            <View style={styles.headerRight}>
                                <Ionicons name="person-outline" size={16} color="#333" />
                                <Text style={styles.userText}>{ roleName }</Text>
                                <Ionicons name="settings-outline" size={20} color="#333" />
                            </View>
                        </View>

                        {/* Metrics Grid */}
                        <View style={styles.metricsGrid}>
                            {/* 4. Converted Views to Touchables with onPress navigation */}
                            <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('TotalAssetDetails')}>
                                <Ionicons name="settings-outline" size={24} color="#6B46C1" />
                                <Text style={styles.metricValue}>{totalAssets}</Text>
                                <Text style={styles.metricLabel}>Total Assets</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('CompanyUsersScreen')}>
                                <Ionicons name="people-outline" size={24} color="#6B46C1" />
                                <Text style={styles.metricValue}>{totalUsers}</Text>
                                <Text style={styles.metricLabel}>Total Users</Text>
                                <Text style={styles.metricSubLabel}></Text>
                            </TouchableOpacity>

                            <View style={styles.metricBox}>
                                <Ionicons name="checkmark-circle-outline" size={24} color="#28A745" />
                                <Text style={styles.metricValueText}>AssetFlow Pro Plan</Text>
                            </View>

                             <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('CompanyUsersScreen')}>
                                <Ionicons name="people-outline" size={24} color="#6B46C1" />
                                <Text style={styles.metricValue}>{totalUsers}</Text>
                                <Text style={styles.metricLabel}>Total Users</Text>
                                <Text style={styles.metricSubLabel}>Supervisors: 15</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('OfficeAssets')}>
                                <Ionicons name="business-outline" size={24} color="#6B46C1" />
                                <Text style={styles.metricValue}>{officeAssets}</Text>
                                <Text style={styles.metricLabel}>Office Assets</Text>
                                <Text style={styles.metricSubLabel}>Operators</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('FieldAssets')}>
                                <Ionicons name="map-outline" size={24} color="#6B46C1" />
                                <Text style={styles.metricValue}>{fieldAssets}</Text>
                                <Text style={styles.metricLabel}>Field Assets</Text>
                            </TouchableOpacity>
                        </View>

                        {/* User Management & Quick Actions */}
                        <View style={styles.bottomContent}>
                            <View style={styles.userSection}>
                                <Text style={styles.sectionTitle}>User Management</Text>
                                <View style={styles.userTable}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.headerCell, {flex: 2}]}>Name</Text>
                                        <Text style={styles.headerCell}>Role</Text>
                                        <Text style={styles.headerCell}>Status</Text>
                                        <Text style={[styles.headerCell, {textAlign: 'center'}]}>Actions</Text>
                                    </View>
                                   {users.map((user:any) => (
                                        <View style={styles.tableRow} key={user.userId ? user.userId : Math.random().toString()}>
                                        <Text style={[styles.cellText, {flex: 2}]}>{user.fullName ? user.fullName : "N/A"}</Text>
                                        <Text style={styles.cellText}>{user.role?.roleName || "—"}</Text>
                                        <Text style={[styles.cellText, { color: '#28A745' }]}>Active</Text>
                                        <View style={styles.actionCell}>
                                            <Text style={styles.actionText}>Manage</Text>
                                        </View>
                                    </View>
                ))}
                                </View>
                            </View>

                            <View style={styles.quickActionsSection}>
                                <Text style={styles.sectionTitle}>Quick Actions</Text>
                                <TouchableOpacity onPress={() => navigation.navigate("AddCompanyUser")}>
                                     <LinearGradient
                                        colors={['#27B2C3', '#40D69B']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={styles.addUserButton}
                                    >
                                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                                        <Text style={styles.addUserButtonText}>Add New User</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Bottom Nav */}
                        <View style={styles.bottomNav}>
                            {/* ... Nav items ... */}
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

// --- STYLES MODIFIED FOR "FROSTED GLASS" EFFECT ---
const styles = StyleSheet.create({
   backgroundImage: {
   flex: 1,
    width: "100%",
    height: "100%",
  },
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        flexDirection: "row",
    },
    leftPanel: {
        width: "25%",
        justifyContent: "center",
        backgroundColor: "rgba(192, 215, 243, 0.52)",
        alignItems: "center",
        padding: 20,
        // The semi-transparent gradient is applied directly in the component
    },
    leftPanelImage: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    leftPanelTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
        textAlign: 'center',
        lineHeight: 40,
    },
    leftPanelSubtitle: {
        fontSize: 18,
        color: "#E0E0FF",
        opacity: 0.8,
        marginTop: 10,
    },
    rightPanel: {
        flex: 1,
        // --- MODIFICATION: Made background semi-transparent white ---
        backgroundColor: "rgba(61, 138, 233, 0.52)",
        padding: 25,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold", // Bolder text for better contrast
        color: "#1A202C", // Darker text color
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        // --- MODIFICATION: Made background semi-transparent ---
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    userText: {
        marginLeft: 8,
        marginRight: 15,
        fontSize: 14,
        fontWeight: '600', // Bolder
        color: '#2D3748', // Darker
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    metricBox: {
        width: "32%",
        // --- MODIFICATION: Made background semi-transparent ---
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        alignItems: "center",
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)', // Lighter border
    },
    metricValue: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#2D3748",
        marginTop: 8,
    },
     metricValueText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2D3748",
        textAlign: 'center',
        marginTop: 8,
    },
    metricLabel: {
        fontSize: 13,
        color: "#4A5568",
        textAlign: 'center',
        marginTop: 2,
    },
    metricSubLabel: {
        fontSize: 11,
        color: "#718096",
        textAlign: 'center',
    },
    bottomContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 20,
    },
    userSection: {
        flex: 2.5,
    },
    quickActionsSection: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1A202C",
        marginBottom: 15,
    },
    userTable: {
        // --- MODIFICATION: Made background semi-transparent ---
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 15,
        padding: 15,
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        paddingBottom: 10,
        marginBottom: 10,
    },
    headerCell: {
        flex: 1,
        fontWeight: 'bold',
        color: '#4A5568',
        fontSize: 13,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    cellText: {
        flex: 1,
        fontSize: 14,
        color: '#2D3748',
    },
    actionCell: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionText: {
        color: '#5A67D8', // Adjusted color for better visibility
        fontWeight: 'bold',
        fontSize: 13,
    },
    addUserButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
    },
    addUserButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "bold",
        marginLeft: 8,
    },
    bottomNav: {
        display: 'none',
    },
});

export default CompanyDashboard;
