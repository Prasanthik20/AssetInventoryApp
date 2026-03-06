import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ImageBackground, Platform, Dimensions, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
// --- For Type Safety with React Navigation ---
import { StackNavigationProp } from '@react-navigation/stack';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { baseURL, RootStackParamList } from '../../navigation/types';
import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";

// 2. Create a specific type for this screen's navigation prop
type Props = NativeStackScreenProps<
  RootStackParamList,
  "CompanyDashboard"
> & {
  setUser: React.Dispatch<React.SetStateAction<any>>;
};
const { width } = Dimensions.get('window');
const isMobile = Platform.OS !== 'web';

const CompanyDashboard: React.FC<Props> = ({
  navigation,
  route,
  setUser : setAppUser,
}) => {

    // 3. Use the strongly-typed navigation hook
    const [users, setUsers] = useState([]);
    const [totalAssets, setTotalAssets] = useState<number | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [officeAssets, setOfficeAssets] = useState<number | null>(null);
    const [fieldAssets, setFieldAssets] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());


    const fetchUsers = async () => {
        try {
            const res = await fetch(`${baseURL}/api/auth/users`);
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

    useEffect(() => {
    const loadUser = async () => {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    };

    loadUser();
}, []);

useEffect(() => {
    if (!user?.employeeId) return;

    const fetchData = async () => {
        await fetchGlobalNotifications();
    };

    fetchData();
}, [user?.employeeId]);


    // ------------------------------------
    // 📌 FETCH DASHBOARD METRICS FROM API
    // ------------------------------------
    const fetchDashboardData = async () => {
        try {
            // Axios returns a response object; the actual data is in .data
            const response = await axios.get(`${baseURL}/api/dashboard`);

            const data = response.data;

            setTotalAssets(data.totalAssets);
            setOfficeAssets(data.officeAssets);
            setFieldAssets(data.fieldAssets);

        } catch (error: any) {
            // Axios gives you more detail on errors (e.g., error.response.data)
            console.log("Dashboard API Error:", error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
  await AsyncStorage.removeItem("user");
  setAppUser(null);
};

    const fetchGlobalNotifications = async () => {
        if (!user?.employeeId) return;
        try {
            const response = await axios.get(
               `${baseURL}/api/notifications/admin`);
            console.log("Employee ID:", user?.employeeId);
            console.log("Fetching:", `${baseURL}/api/notifications/admin?id=${user?.employeeId}`);

            setNotifications(response.data.notifications || []);
        } catch (error) {
            console.error("Axios notification error:", error);
        }
    };

    const hideNotification = async (id: number) => {
  try {
    await axios.put(`${baseURL}/api/notifications/hide`, { id });

    setNotifications((prev) =>
      prev.filter((item) => item.id !== id)
    );
  } catch (error) {
    console.error(error);
  }
};

    const toggleGroup = (senderName: string) => {
        setExpandedGroups((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(senderName)) {
                newSet.delete(senderName);
            } else {
                newSet.add(senderName);
            }
            return newSet;
        });
    };

    // -------------------------
    // 📌 RUN ON PAGE OPEN
    // -------------------------
    useFocusEffect(
  useCallback(() => {
    fetchUsers();
    fetchDashboardData();
  }, [])
);

    return (
        <ImageBackground
            source={require("../../assets/Company-bg.webp")}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={5}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Left Panel (Web Only) */}
                    {Platform.OS === 'web' && (
                        <View style={styles.leftPanel}>
                            <Image
                                source={{ uri: user?.photoURL || "https://i.imgur.com/6VBx3io.png" }}
                                style={{ width: 120, height: 120, borderRadius: 40 }}
                            />
                            <Text style={styles.leftPanelName}>{user?.fullName }</Text>
                            <Text style={styles.leftPanelRole}>{user?.roleName }</Text>
                        </View>
                    )}

                    {/* Main Content Area */}
                    <ScrollView
                        style={styles.mainScroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.rightPanel, isMobile && styles.mobilePadding]}>

                            {/* Mobile Header */}
                            {isMobile && (
                                <View style={styles.mobileHeaderCard}>
                                    <View style={styles.mobileUserRow}>
                                        <Image source={{ uri: user?.photoURL || "https://i.imgur.com/6VBx3io.png" }} style={styles.mobileAvatar} />
                                        <View>
                                            <Text style={styles.mobileAdminName}>{user?.fullName}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={handleLogout}>
                                        <Feather name="log-out" size={24} color="#FF4D4D" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* System Overview Header */}
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>System Overview</Text>
                                {!isMobile && (
                                    <View style={styles.headerRight}>
                                        <Ionicons name="person-outline" size={16} color="#333" />
                                        <Text style={styles.userText}>{user?.roleName}</Text>
                                        <TouchableOpacity onPress={handleLogout}>
                                            <Feather name="log-out" size={24} color="#FF4D4D" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Metrics Grid - 4 in a row on Web */}
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
                            </View>

                            {/* Bottom Content Row - Side-by-Side on Web */}
                            <View style={styles.bottomRow}>
                                {/* Activity Feed */}
                                <View style={styles.feedContainer}>
                                    <Text style={styles.sectionTitle}>Global Activity Feed</Text>
                                    <View style={styles.notificationFeed}>
                                        {notifications.length > 0 ? (
                                            (() => {
                                                // Group notifications by sender
                                                const groupedNotifications = notifications.reduce((acc, item) => {
                                                    const senderName = item.sender?.name || "Unknown";
                                                    if (!acc[senderName]) {
                                                        acc[senderName] = [];
                                                    }
                                                    acc[senderName].push(item);
                                                    return acc;
                                                }, {} as Record<string, any[]>);

                                                return Object.keys(groupedNotifications).map((senderName, groupIndex) => {
                                                    const userNotifications = groupedNotifications[senderName];
                                                    const firstNotif = userNotifications[0];
                                                    const isSupervisor = senderName.toLowerCase().includes("supervisor");
                                                    const isExpanded = expandedGroups.has(senderName);

                                                    return (
                                                        <View key={`group-${groupIndex}`} style={styles.notifGroup}>
                                                            {/* Group Header */}
                                                            <TouchableOpacity 
                                                                style={styles.groupHeader}
                                                                onPress={() => toggleGroup(senderName)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={styles.groupHeaderLeft}>
                                                                    <View
                                                                        style={[
                                                                            styles.groupIndicator,
                                                                            {
                                                                                backgroundColor: isSupervisor ? "#4C51BF" : "#38B2AC",
                                                                            },
                                                                        ]}
                                                                    />
                                                                    <Text style={styles.groupSenderName}>{senderName}</Text>
                                                                    <View style={[styles.notifBadge, { backgroundColor: isSupervisor ? "#E9D5FF" : "#B2F5EA" }]}>
                                                                        <Text style={[styles.notifBadgeText, { color: isSupervisor ? "#6B21A8" : "#00796B" }]}>
                                                                            {userNotifications.length}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                                <Ionicons 
                                                                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                                                                    size={20} 
                                                                    color="#718096" 
                                                                />
                                                            </TouchableOpacity>

                                                            {/* Group Notifications */}
                                                            {isExpanded && userNotifications.map((item: any, index: number) => (
                                                                <TouchableOpacity
                                                                    key={item.id || `${groupIndex}-${index}`}
                                                                    style={styles.notifLine}
                                                                    onPress={() => hideNotification(item.id)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <View style={styles.notifMainContent}>
                                                                        <View style={styles.notifHeaderRow}>
                                                                            <View style={styles.tagContainer}>
                                                                                <Text style={styles.roleTagText}>
                                                                                    {item.status}
                                                                                </Text>
                                                                            </View>
                                                                            <Text style={styles.notifTime}>
                                                                                {item.createdAt
                                                                                    ? new Date(item.createdAt).toLocaleDateString("en-GB")
                                                                                    : ""}
                                                                            </Text>
                                                                        </View>

                                                                        <Text style={styles.assetContext}>
                                                                            Asset:{" "}
                                                                            <Text style={{ fontWeight: "bold" }}>
                                                                                {item.asset?.name || "N/A"}
                                                                            </Text>
                                                                        </Text>

                                                                        <Text style={styles.notifMessage} numberOfLines={2}>
                                                                            "{item.message}"
                                                                        </Text>

                                                                        <Text style={styles.tapToHideText}>
                                                                            Tap to mark as seen
                                                                        </Text>
                                                                    </View>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    );
                                                });
                                            })()
                                        ) : (
                                            <View style={styles.emptyContainer}>
                                                <Text style={styles.emptyText}>No activity recorded</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Quick Actions */}
                                <View style={styles.actionsContainer}>
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
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </ImageBackground >
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
    mainScroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    leftPanel: {
        width: "25%",
        justifyContent: "center",
        backgroundColor: "rgba(192, 215, 243, 0.52)",
        alignItems: "center",
        padding: 20,
    },
    leftPanelName: { fontSize: 32, fontWeight: "bold", marginTop: 10 },
    leftPanelRole: { fontSize: 24, color: "gray" },
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
    // Right Panel & Mobile Adapters
    rightPanel: {
        flex: 1,
        backgroundColor: Platform.OS === 'web' ? "rgba(61, 138, 233, 0.4)" : "transparent",
        padding: 25,
    },
    mobilePadding: { padding: 15 },
    idBadge: {
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    idBadgeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3748',
        letterSpacing: 0.5,
    },
    mobileHeaderCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    mobileUserRow: { flexDirection: 'row', alignItems: 'center' },
    mobileAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
    mobileWelcome: { fontSize: 12, color: '#718096' },
    mobileAdminName: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
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
    // Metrics Grid
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 20,
        width: '100%',
    },
    metricBox: {
        // 23.5% width allows 4 items + spacing in one row on web
        width: Platform.OS === 'web' ? "23.5%" : "48%",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        alignItems: "center",
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    metricValue: { fontSize: 24, fontWeight: "bold", color: "#1A202C" },
    metricLabel: { fontSize: 13, color: "#718096", fontWeight: '600' },
    metricValueText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2D3748",
        textAlign: 'center',
        marginTop: 8,
    },
    metricSubLabel: {
        fontSize: 11,
        color: "#718096",
        textAlign: 'center',
    },
    bottomRow: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        justifyContent: 'space-between',
        width: '100%',
        gap: 25,
    },
    feedContainer: {
        flex: Platform.OS === 'web' ? 3 : 1, // Takes 75% of space on web
    },
    actionsContainer: {
        flex: Platform.OS === 'web' ? 1 : 1, // Takes 25% of space on web
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
    sectionTitle: { fontSize: 20, fontWeight: "800", color: "#1A202C", marginBottom: 15, marginTop: 10 },
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
    // Floating Button for Mobile
    floatingAction: {
        position: Platform.OS === 'web' ? 'relative' : 'absolute',
        bottom: Platform.OS === 'web' ? 0 : 30,
        left: Platform.OS === 'web' ? 0 : 20,
        right: Platform.OS === 'web' ? 0 : 20,
    },
    addUserButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        elevation: 8,
    },
    addUserButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginLeft: 8 },
    actionText: {
        color: '#5A67D8', // Adjusted color for better visibility
        fontWeight: 'bold',
        fontSize: 13,
    },
    bottomNav: {
        display: 'none',
    },
    notificationFeed: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Solid white or high-opacity glass
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',

        // --- THIS FORCES THE CARD TO BE VISIBLE IRRESPECTIVE OF CONTENT ---
        minHeight: 200, // Adjust this value to match your Quick Actions height
        width: '100%',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyText: {
        color: '#718096',
        fontSize: 16,
        fontStyle: 'italic',
    },
    notifGroup: {
        marginBottom: 20,
        borderRadius: 12,
        backgroundColor: '#F7FAFC',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#EDF2F7',
        borderBottomWidth: 1,
        borderBottomColor: '#CBD5E0',
        cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    },
    groupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    groupSenderName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748',
        marginRight: 10,
    },
    notifBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    notifBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    roleIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
    notifMainContent: { flex: 1 },
    senderName: { fontSize: 15, fontWeight: 'bold', color: '#2D3748' },
    roleTag: { fontWeight: 'normal', color: '#A0AEC0', fontSize: 11 },
    notifMessage: { fontSize: 13, color: '#4A5568', marginTop: 2, fontStyle: 'italic' },
    notifTime: { fontSize: 11, color: '#CBD5E0', marginLeft: 'auto' },
    notifLine: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
    },
    notifHeaderRow: { 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    tagContainer: {
        backgroundColor: '#EDF2F7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    roleTagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4A5568',
        textTransform: 'uppercase',
    },
    assetContext: {
        fontSize: 12,
        color: '#718096',
        marginTop: 4,
        marginBottom: 4,
    },
    tapToHideText: {
        fontSize: 11,
        color: '#A0AEC0',
        fontStyle: 'italic',
        marginTop: 6,
    },
});

export default CompanyDashboard;
