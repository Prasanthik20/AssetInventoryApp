import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

export type SupervisorStackParamList = {
    SupervisorDashboard: undefined;
    AddEditAsset: undefined;
    AssignAsset: undefined;
    TotalAssetDetails: undefined; // The screen we want to navigate to
    // Add other screens like OfficeAssets, FieldAssets if needed
};

type SupervisorNavigationProp = StackNavigationProp<SupervisorStackParamList, 'SupervisorDashboard'>;

const SupervisorDashboard: React.FC = () => {
  
    const navigation = useNavigation<SupervisorNavigationProp>();

    const metrics = [
        { title: 'Total Assets', value: '4500', icon: 'settings-outline',navigateTo: 'TotalAssetDetails' as keyof SupervisorStackParamList },
        { title: 'Assets in Office', value: '2800', icon: 'business-outline' },
        { title: 'Assets in Field', value: '1000', icon: 'map-outline' },
        { title: 'Assigned to Operators', value: '1700', subValue: '45', icon: 'people-outline' },
        { title: 'Field Available', value: '1700', subValue: '45', icon: 'construct-outline' },
    ];

    const recentActivity = [
        { icon: 'document-text-outline', text: 'John S. assigned "Laptop #BAR456" to Jane D.', subtext: 'Jane D.', timestamp: '23313-109' },
        { icon: 'hardware-chip-outline', text: 'New asset "Drill #BAR789"', subtext: 'adde D', timestamp: '23313-109' },
        { icon: 'archive-outline', text: 'Jane asset returned joinedA4756" #BAR759"', subtext: '', timestamp: '23313-109' },
    ];

    return (
        <ImageBackground
              source={require("../../assets/Company-bg.webp")}
              style={styles.backgroundImage}
              resizeMode="cover"
              blurRadius={5}
            >
            {/* SafeAreaView should be transparent */}
            <SafeAreaView style={styles.safeArea}>
                {/* A new container View holds all the content */}
                <View style={styles.container}>
                    {/* Header Section */}
                    <View style={styles.topSection}>
                        <View style={styles.headerLeft}>
                            <View style={styles.logoBg}>
                                <Feather name="box" size={24} color="#fff" />
                            </View>
                            <Text style={styles.headerTitle}>Supervisor Dashboard</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <Feather name="user" size={16} color="#333" />
                            <Text style={styles.userText}>Supervisor</Text>
                            <Switch
                                trackColor={{ false: "#E9E9EA", true: "#34C759" }}
                                thumbColor={"#f4f3f4"}
                                value={true}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                            <Feather name="settings" size={20} color="#333" style={{marginLeft: 5}} />
                        </View>
                    </View>

                    {/* Main Content Body */}
                    <View style={styles.bottomSection}>
                        {/* Metrics Grid */}
                        <View style={styles.metricsGrid}>
                            {metrics.map((metric, index) => (
                                <TouchableOpacity style={styles.metricBox} key={index}
                                disabled={!metric.navigateTo}
                                    // The 'as any' is removed now that the types are correct
                                    onPress={() => metric.navigateTo && navigation.navigate(metric.navigateTo)}
    >
                                    <Ionicons name={metric.icon as any} size={24} color="#4A90E2" />
                                    <Text style={styles.metricTitle}>{metric.title}</Text>
                                    <Text style={styles.metricValue}>{metric.value}</Text>
                                    {metric.subValue && (
                                        <>
                                            <View style={styles.divider} />
                                            <Text style={styles.metricSubValue}>{metric.subValue}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Main Content Area */}
                        <View style={styles.mainContent}>
                            <View style={styles.activitySection}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                {recentActivity.map((item, index) => (
                                    <View style={styles.activityItem} key={index}>
                                        <Ionicons name={item.icon as any} size={20} color="#555" style={styles.activityIcon} />
                                        <View style={styles.activityTextContainer}>
                                            <Text style={styles.activityText}>{item.text}</Text>
                                            <Text style={styles.activitySubtext}>{item.subtext}</Text>
                                        </View>
                                        <Text style={styles.activityTimestamp}>{item.timestamp}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.actionsSection}>
                                <Text style={styles.sectionTitle}>Quick Actions</Text>
                                <TouchableOpacity style={[styles.actionButton, styles.blueButton]} onPress={() => navigation.navigate('AddEditAsset')}>
                                    <Text style={styles.actionButtonText}>Add New Asset</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.whiteButton]}>
                                    <Text style={[styles.actionButtonText, styles.whiteButtonText]}>Scan Barcode</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navigation.navigate('AssignAsset')}>
                                    <LinearGradient
                                        colors={['#27B2C3', '#40D69B']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={[styles.actionButton, { borderWidth: 0 }]}
                                    >
                                        <Text style={styles.actionButtonText}>Assign/Return Asset</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bottom Nav is now outside the main container to float correctly */}
                <View style={styles.bottomNav}>
                    <View style={styles.bottomNavLeft}>
                        <TouchableOpacity style={styles.navItem}>
                            <Ionicons name="grid-outline" size={20} color="#333" />
                            <Text style={styles.navText}>Dashboard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <Ionicons name="people-outline" size={20} color="#333" />
                            <Text style={styles.navText}>Operators</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <Ionicons name="document-text-outline" size={20} color="#333" />
                            <Text style={styles.navText}>Reports</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.bottomNavRight}>
                        <TouchableOpacity style={styles.navItem}>
                            <MaterialCommunityIcons name="web" size={20} color="#333" />
                            <Text style={styles.navText}>Web</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <MaterialCommunityIcons name="cellphone" size={20} color="#333" />
                            <Text style={styles.navText}>iOS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

// --- STYLES REVISED FOR CORRECT BACKGROUND IMAGE VISIBILITY ---
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
    },
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // --- MODIFICATION: Made header semi-transparent ---
        backgroundColor: 'rgba(61, 138, 233, 0.52)',
        paddingHorizontal: 25,
        paddingVertical: 15,
        paddingTop: 40,
    },
    bottomSection: {
        flex: 1,
        backgroundColor: 'transparent', // Content area is transparent
        padding: 25,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBg: {
        backgroundColor: 'rgba(85, 85, 85, 0.8)',
        padding: 8,
        borderRadius: 10,
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0e1215ff',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    userText: {
        marginLeft: 8,
        marginRight: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 15,
        padding: 15,
        width: '19%',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(18, 7, 7, 0.9)',
    },
    metricTitle: {
        fontSize: 13,
        color: '#4A5568',
        marginTop: 8,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A202C',
        marginTop: 4,
    },
    divider: {
        height: 1.5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        width: '40%',
        marginVertical: 8,
    },
    metricSubValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4A5568',
        alignSelf: 'flex-end',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 20,
    },
    activitySection: {
        flex: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    actionsSection: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#1A202C',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    activityIcon: {
        marginRight: 15,
    },
    activityTextContainer: {
        flex: 1,
    },
    activityText: {
        fontSize: 14,
        color: '#2D3748',
        fontWeight: '500',
    },
    activitySubtext: {
        fontSize: 12,
        color: '#718096',
        marginTop: 2,
    },
    activityTimestamp: {
        fontSize: 12,
        color: '#718096',
    },
    actionButton: {
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
    },
    blueButton: {
        backgroundColor: '#4A90E2',
        borderColor: '#4A90E2',
    },
    whiteButton: {
        backgroundColor: '#FFF',
        borderColor: '#DDD',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    whiteButtonText: {
        color: '#4A90E2',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    bottomNavLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomNavRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    navText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#333'
    },
});

export default SupervisorDashboard;