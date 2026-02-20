import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ImageBackground, Platform, Dimensions, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from '@react-navigation/stack';
import { baseURL } from '../../navigation/types';
import axios from 'axios';

// 1. UPDATED: Added CompanyLogin to the Param List
export type RootStackParamList = {
    CompanyDashboard: {
        adminName: string;
        adminImage: string | null;
        roleName: string;
    };
    CompanyLogin: undefined; // <--- Critical fix for the error
    AddCompanyUser: undefined;
    TotalAssetDetails: undefined;
    CompanyUsersScreen: undefined;
    OfficeAssets: undefined;
    FieldAssets: undefined;
};

type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'CompanyDashboard'>;
type DashboardRoute = RouteProp<RootStackParamList, "CompanyDashboard">;

const { width } = Dimensions.get('window');
const isMobile = Platform.OS !== 'web';

const CompanyDashboard: React.FC = () => {
    const navigation = useNavigation<DashboardNavigationProp>();
    const route = useRoute<DashboardRoute>();

    const { adminName, adminImage, roleName } = route.params;
    const [users, setUsers] = useState([]);
    const [totalAssets, setTotalAssets] = useState<number | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [officeAssets, setOfficeAssets] = useState<number | null>(null);
    const [fieldAssets, setFieldAssets] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${baseURL}/api/auth/users`);
            const data =  res.data;
            if (data && Array.isArray(data.users)) {
                setUsers(data.users);
                setTotalUsers(data.count);
            }
        } catch (error) {
            console.error("Users API Error:", error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get(`${baseURL}/api/dashboard`);
            const data = response.data;
            setTotalAssets(data.totalAssets);
            setOfficeAssets(data.officeAssets);
            setFieldAssets(data.fieldAssets);
        } catch (error) {
            console.log("Dashboard API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalNotifications = async () => {
        try {
            const response = await axios.get(`${baseURL}/api/notifications`);
            setNotifications(response.data);
        } catch (error) {
            console.error("Axios notification error:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchDashboardData();
        fetchGlobalNotifications();
    }, []);

    return (
        <ImageBackground
            source={require("../../assets/Company-bg.webp")}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={isMobile ? 10 : 5}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* LEFT PANEL: WEB ONLY */}
                    {Platform.OS === 'web' && (
                        <View style={styles.leftPanel}>
                            <Image 
                                source={{ uri: adminImage || "https://i.imgur.com/6VBx3io.png" }}
                                style={{ width: 120, height: 120, borderRadius: 40 }} 
                            />
                            <Text style={styles.leftPanelName}>{adminName}</Text>
                            <Text style={styles.leftPanelRole}>{roleName}</Text>
                        </View>
                    )}

                    {/* MAIN CONTENT */}
                    <ScrollView 
                        style={styles.mainScroll} 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >                  
                        <View style={[styles.rightPanel, isMobile && styles.mobilePadding]}>
                            
                            {/* MOBILE HEADER */}
                            {isMobile && (
                                <View style={styles.mobileHeaderCard}>
                                    <View style={styles.mobileUserRow}>
                                        <Image source={{ uri: adminImage || "https://i.imgur.com/6VBx3io.png" }} style={styles.mobileAvatar} />
                                        <View>
                                            <Text style={styles.mobileWelcome}>Welcome back,</Text>
                                            <Text style={styles.mobileAdminName}>{adminName}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: "CompanyLogin" }] })}>
                                        <Feather name="log-out" size={24} color="#FF4D4D" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>System Overview</Text>
                                {!isMobile && (
                                    <View style={styles.headerRight}>
                                        <Ionicons name="person-outline" size={16} color="#333" />
                                        <Text style={styles.userText}>{roleName}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Metrics Grid */}
                            <View style={styles.metricsGrid}>
                                <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('TotalAssetDetails')}>
                                    <Ionicons name="settings-outline" size={24} color="#6B46C1" />
                                    <Text style={styles.metricValue}>{totalAssets ?? 0}</Text>
                                    <Text style={styles.metricLabel}>Total Assets</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('CompanyUsersScreen')}>
                                    <Ionicons name="people-outline" size={24} color="#6B46C1" />
                                    <Text style={styles.metricValue}>{totalUsers ?? 0}</Text>
                                    <Text style={styles.metricLabel}>Total Users</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('OfficeAssets')}>
                                    <Ionicons name="business-outline" size={24} color="#6B46C1" />
                                    <Text style={styles.metricValue}>{officeAssets ?? 0}</Text>
                                    <Text style={styles.metricLabel}>Office Assets</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.metricBox} onPress={() => navigation.navigate('FieldAssets')}>
                                    <Ionicons name="map-outline" size={24} color="#6B46C1" />
                                    <Text style={styles.metricValue}>{fieldAssets ?? 0}</Text>
                                    <Text style={styles.metricLabel}>Field Assets</Text>
                                </TouchableOpacity>

                                <View style={styles.metricBoxFull}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#28A745" />
                                    <Text style={styles.metricValueText}>AssetFlow Pro Plan Active</Text>
                                </View>
                            </View>

                            {/* Global Activity Feed */}
                            <View style={styles.userSection}>
                                <Text style={styles.sectionTitle}>Global Activity Feed</Text>
                                <View style={styles.notificationFeed}>
                                    {notifications.map((item, index) => (
                                        <View key={item.id || index} style={styles.notifLine}>
                                            <View style={[
                                                styles.roleIndicator,
                                                { backgroundColor: item.senderRole === 'Supervisor' ? '#4C51BF' : '#38B2AC' }
                                            ]} />
                                            <View style={styles.notifMainContent}>
                                                <View style={styles.notifHeaderRow}>
                                                    <Text style={styles.senderName}>{item.senderName}</Text>
                                                    <View style={styles.tagContainer}>
                                                        <Text style={styles.roleTagText}>{item.senderRole}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.assetContext}>
                                                    Asset: <Text style={{ fontWeight: 'bold' }}>{item.assetName}</Text>
                                                </Text>
                                                <Text style={styles.notifMessage} numberOfLines={2}>"{item.message}"</Text>
                                            </View>
                                            <Text style={styles.notifTime}>
                                                {new Date(item.createdAt).toLocaleDateString('en-GB')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Quick Actions */}
                            <View style={styles.quickActionsSection}>
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
                    </ScrollView>
                </View>
            </SafeAreaView>
        </ImageBackground >
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: "100%", height: "100%" },
    safeArea: { flex: 1 },
    container: { flex: 1, flexDirection: "row" },
    mainScroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 20 },
    leftPanel: {
        width: "25%",
        justifyContent: "center",
        backgroundColor: "rgba(192, 215, 243, 0.7)",
        alignItems: "center",
        padding: 20,
    },
    leftPanelName: { fontSize: 32, fontWeight: "bold", marginTop: 10 },
    leftPanelRole: { fontSize: 24, color: "gray" },
    rightPanel: {
        flex: 1,
        backgroundColor: Platform.OS === 'web' ? "rgba(61, 138, 233, 0.4)" : "transparent",
        padding: 25,
    },
    mobilePadding: { padding: 15 },
    mobileHeaderCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 15,
        borderRadius: 20,
        marginBottom: 20,
        elevation: 4,
    },
    mobileUserRow: { flexDirection: 'row', alignItems: 'center' },
    mobileAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
    mobileWelcome: { fontSize: 12, color: '#718096' },
    mobileAdminName: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1A202C" },
    headerRight: { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: 8, borderRadius: 20 },
    userText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#2D3748' },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    metricBox: {
        width: Platform.OS === 'web' ? "31%" : "48%",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 24,
        padding: 18,
        marginBottom: 15,
        alignItems: "center",
    },
    metricBoxFull: {
        width: '100%',
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: 15,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    metricValue: { fontSize: 24, fontWeight: "bold", color: "#1A202C" },
    metricLabel: { fontSize: 13, color: "#718096", fontWeight: '600' },
    metricValueText: { fontSize: 14, fontWeight: "bold", color: "#2D3748", marginLeft: 8 },
    userSection: { marginTop: 10 },
    sectionTitle: { fontSize: 20, fontWeight: "800", color: "#1A202C", marginBottom: 15 },
    notificationFeed: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 16,
        padding: 10,
    },
    notifHeaderRow: {flexDirection: 'row', alignItems: 'center',},
    notifLine: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', alignItems: 'center' },
    roleIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
    notifMainContent: { flex: 1 },
    senderName: { fontSize: 15, fontWeight: 'bold', color: '#2D3748' },
    tagContainer: { backgroundColor: '#EDF2F7', paddingHorizontal: 6, borderRadius: 4, marginLeft: 8 },
    roleTagText: { fontSize: 10, fontWeight: 'bold', color: '#4A5568' },
    assetContext: { fontSize: 12, color: '#718096', marginTop: 2 },
    notifMessage: { fontSize: 13, color: '#4A5568', marginTop: 2, fontStyle: 'italic' },
    notifTime: { fontSize: 10, color: '#CBD5E0', marginLeft: 10 },
    quickActionsSection: { marginTop: 20 },
    addUserButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20 },
    addUserButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginLeft: 8 },
});

export default CompanyDashboard;