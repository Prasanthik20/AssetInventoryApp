import React , { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, TouchableOpacity,Alert , Switch, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; 
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';

const OperatorDashboard: React.FC = () => {

  const navigation = useNavigation<any>(); 
  const myAssets = [
    { name: 'Excavator', barcode: 'BAR456', dueDate: 'Overdue', icon: 'bus-outline' },
    { name: 'Jackhammer', barcode: 'BAR789', dueDate: 'Due in 3 days', icon: 'hardware-chip-outline' },
    { name: 'Safety Vest', barcode: 'BAR901', dueDate: 'No due date', icon: 'shirt-outline' },
  ];

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOverdueAsset, setSelectedOverdueAsset] = useState('');

  const handleOpenModal = (assetName: string) => {
    setSelectedOverdueAsset(assetName);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOverdueAsset('');
  };

  const handleSubmitNotification = (reason: string) => {
    // In a real app, send this data to your backend/API
    console.log(`Reason for overdue asset "${selectedOverdueAsset}": ${reason}`);
    Alert.alert("Notification Sent", "Your supervisor has been notified.", [{ text: "OK" }]);
    handleCloseModal();
  };

  return (
    <ImageBackground
      source={require("../../assets/Company-bg.webp")}
      style={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}> 
        <View style={styles.container}>
          {/* Left Decorative Panel */}
          <LinearGradient
            colors={['rgba(93, 113, 200, 0.7)', 'rgba(59, 89, 184, 0.8)']}
            style={styles.leftPanel}
          >
            <Image
              // --- FIXED IMAGE URI ---
              source={{ uri: 'https://i.imgur.com/gYf2xmm.png' }}
              style={styles.leftPanelImage}
            />
            <Text style={styles.leftPanelTitle}>YOUR ASSIGNED{'\n'}EQUIPMENT</Text>
            <Text style={styles.leftPanelSubtitle}>ASSETFLOW PRO</Text>
          </LinearGradient>

          {/* Right Content Panel */}
          <View style={styles.rightPanel}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Operator Dashboard</Text>
              <View style={styles.headerRight}>
                <Feather name="user" size={16} color="#333" />
                <Text style={styles.userText}>Operator</Text>
                <Switch
                    trackColor={{ false: "#E9E9EA", true: "#34C759" }}
                    thumbColor={"#f4f3f4"}
                    value={true}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <Feather name="settings" size={20} color="#333" style={{marginLeft: 5}}/>
              </View>
            </View>

            {/* Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                  <View style={styles.metricIconBg}>
                    <Ionicons name="construct-outline" size={20} color="#3B59B8" />
                  </View>
                  <Text style={styles.metricTitle}>Assigned Assets</Text>
                  <Text style={styles.metricValue}>
                    3
                  </Text>
              </View>
              <View style={styles.metricBox}>
                  <View style={styles.metricIconBg}>
                    <Feather name="map-pin" size={18} color="#3B59B8" />
                  </View>
                  <Text style={styles.metricTitle}>Current Location</Text>
                  <Text style={[styles.metricValue, {fontSize: 18, flexShrink: 1}]}>
                    Downtown Site, Block A
                  </Text>
              </View>
            </View>

            {/* My Assets List */}
            <View style={styles.assetsSection}>
              <Text style={styles.sectionTitle}>My Assets</Text>
              {myAssets.map((asset, index) => {
                const isOverdue = asset.dueDate === 'Overdue';
                return (
                  <View style={styles.assetItem} key={index}>
                    <View style={styles.assetIconBg}>
                      <Ionicons name={asset.icon as any} size={20} color="#3B59B8" />
                    </View>
                    <View style={styles.assetNameContainer}>
                      <Text style={styles.assetName}>{asset.name} ({asset.barcode})</Text>
                    </View>
                    
                    {/* --- MODIFICATION START --- */}
                    {/* This container now holds both the text and the button */}
                    <View style={styles.dueDateContainer}>
                      <Text style={[styles.assetDueDate, isOverdue && styles.overdueText]}>
                          {asset.dueDate}
                      </Text>
                      {isOverdue && (
                          <TouchableOpacity style={styles.notifyButton} onPress={() => handleOpenModal(asset.name)}>
                              <Text style={styles.notifyButtonText}>Notify</Text>
                          </TouchableOpacity>
                      )}
                    </View>
               </View>
                );
              })}
            </View>

            {/* Return Asset Button */}
            <TouchableOpacity onPress={() => navigation.navigate('ReturnAsset')}>
              <LinearGradient
                colors={['#27B2C3', '#40D69B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.returnButton}
              >
                <Text style={styles.returnButtonText}>RETURN ASSET</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
              {/* Bottom Nav items here... */}
            </View>
          </View>
        </View>
        <OverdueNotificationModal
            visible={modalVisible}
            onClose={handleCloseModal}
            onSubmit={handleSubmitNotification}
            assetName={selectedOverdueAsset}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
   assetNameContainer: {
        flex: 1, // Allows the asset name to take up available space
    },
    dueDateContainer: { // New container for due date and button
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto', // Pushes the container to the right
    },
     overdueText: { // New style for the "Overdue" text
        color: '#DC3545',
        fontWeight: 'bold',
    },
    notifyButton: {
        marginLeft: 'auto',
        backgroundColor: '#DC3545',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    notifyButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
   backgroundImage: {
    flex: 1,  
    width: '100%',
    height: '100%',
  },
    safeArea: {
        flex: 1,
    },
    // Renamed 'dashboardCard' to 'container'
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        width: '40%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        // Gradient is applied directly in the component
    },
    leftPanelImage: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
        marginBottom: 30,
    },
    leftPanelTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 40,
    },
    leftPanelSubtitle: {
        fontSize: 16,
        color: '#E0E0FF',
        marginTop: 10,
        opacity: 0.8,
    },
    rightPanel: {
        flex: 1,
        // Semi-transparent background
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        padding: 25,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold', // Bolder text
        color: '#FFFFFF', // White text for better contrast
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
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    metricBox: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    metricIconBg: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(59, 89, 184, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    metricTitle: {
        fontSize: 14,
        color: '#4A5568', // Darker gray for readability
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A202C', // Dark text
        marginTop: 5,
    },
    assetsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 15,
    },
    assetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    assetIconBg: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    assetName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3748',
    },
    assetDueDate: {
        marginLeft: 'auto',
        fontSize: 14,
        color: '#4A5568',
        fontWeight: '500',
    },
    returnButton: {
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
    },
    returnButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 18,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 12,
        color: '#4A5568',
        marginTop: 4,
    },
});

export default OperatorDashboard;