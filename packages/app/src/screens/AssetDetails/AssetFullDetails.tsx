import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, TouchableOpacity, Switch, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather,FontAwesome, MaterialCommunityIcons,Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import useAssetMeta from "../../hooks/useAssetMeta";


type AssetFullDetailsRouteProp = RouteProp<
    RootStackParamList,
    'AssetFullDetails'
>;
const iconMap: any = {
    truck: <Feather name="truck" size={16} color="#222" />,
    layers: <Feather name="layers" size={16} color="#222" />,
    "check-circle": <Feather name="check-circle" size={16} color="#222" />,
    archive: <MaterialCommunityIcons name="archive" size={16} color="#222" />,
    hash: <MaterialCommunityIcons name="pound" size={16} color="#222" />,
    dollar: <FontAwesome name="dollar" size={16} color="#222" />,
    "map-pin": <Feather name="map-pin" size={16} color="#222" />,
    "user-check": <Feather name="user-check" size={16} color="#222" />,
    calendar: <Feather name="calendar" size={16} color="#222" />,
};
const DisplayField = ({ label, value, icon, children }: { label: string, value?: string, icon?: any, children?: React.ReactNode }) => (
     <View style={styles.fieldContainer}>
        <View style={styles.labelContainer}>
            {icon && iconMap[icon]}
            <Text style={styles.label}>{label}</Text>
        </View>

        <View style={styles.valueBox}>
            {children || <Text style={styles.valueText}>{value}</Text>}
        </View>
    </View>
);

const AssetFullDetails: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<AssetFullDetailsRouteProp>();
    const { categories, statuses } = useAssetMeta();
    const { asset } = route.params;
    const matchedCategory = categories.find(c => String(c.id) === String(asset.category));
    const matchedStatus = statuses.find(s => String(s.id) === String(asset.status));
    if (!asset) {
        return <Text>Asset not found!</Text>;
    }

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
                            source={{ uri: 'https://i.imgur.com/gYf2xmm.png' }}
                            style={styles.leftPanelImage}
                        />
                        <Text style={styles.leftPanelTitle}>ASSET DETAILS</Text>
                        <Text style={styles.leftPanelSubtitle}>COMPREHENSIVE EQUIPMENT RECORD</Text>
                        <Text style={styles.brandName}>ASSETFLOW PRO</Text>
                    </LinearGradient>

                    {/* Right Details Panel */}
                    <View style={styles.rightPanel}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#000000ff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Asset Information</Text>
                            <View style={styles.headerRight}>
                                <Feather name="user" size={16} color="#333" />
                                <Text style={styles.userText}>Supervisor</Text>
                                <Switch
                                    trackColor={{ false: "#E9E9EA", true: "#34C759" }}
                                    thumbColor={"#f4f3f4"} value={true}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                                <Feather name="settings" size={20} color="#333" style={{ marginLeft: 5 }} />
                            </View>
                        </View>

                        {/* Details Body */}
                        <View style={styles.formBody}>
                            {/* Left Column */}
                            <View style={styles.formColumn}>
                                <Text style={styles.sectionTitle}>General Details</Text>
                                <DisplayField label="Asset Name" value={asset.assetName} icon="truck" />
                                
                                <DisplayField  label="Category" value={matchedCategory?.category || asset.category} icon="layers">
                                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <Text style={styles.valueText}>{asset.category}</Text>
                                        <Switch value={true} trackColor={{ false: "#E9E9EA", true: "#81b0ff" }} thumbColor={"#f4f3f4"} style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }} />
                                    </View>
                                </DisplayField>
                                <DisplayField  label="Status" value={matchedStatus?.status || asset.status} icon="check-circle" />
                                <DisplayField label="Model Number" value={asset.modelNumber} icon="archive" />
                                <DisplayField label="Serial Number" value={asset.serialNumber} icon="hash" />
                                <DisplayField label="Price" value={asset.price} icon="dollar" />
                            </View>

                            {/* Right Column */}
                            <View style={styles.formColumn}>
                                <Image source={{ uri: 'https://i.imgur.com/gJuQe3h.png' }} style={styles.barcodeImage} />
                                <Text style={styles.barcodeText}>Asset ID: {asset.barcode}</Text>
                                <Text style={styles.currentUserText}>
                                    {asset.status === 'Assigned' || asset.status === 'Overdue'
                                        ? `Currently with ${asset.assignedTo}`
                                        : 'Currently in storage'}
                                </Text>

                                <DisplayField label="Current Location" value={asset.location} icon="map-pin" />
                                <DisplayField label="Assigned By" value={asset.assignedBy} icon="user-check" />
                                <DisplayField label="Assigned To" value={asset.assignedTo} icon="user-check" />
                                <DisplayField label="Warranty Expiry" value={asset.warrantyExpiry instanceof Date ? asset.warrantyExpiry.toLocaleDateString() : String(asset.warrantyExpiry)} icon="calendar" />
                                <DisplayField label="Purchase Date" value={asset.purchaseDate instanceof Date ? asset.purchaseDate.toLocaleDateString() : String(asset.purchaseDate)} icon="calendar" />
                            </View>
                        </View>
                        
                        {/* Action Buttons */}
                        <View style={styles.footer}>
                            <TouchableOpacity>
                                <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.saveButton}>
                                    <Text style={styles.buttonText}>EDIT ASSET</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                                <Text style={[styles.buttonText, { color: '#555' }]}>Go Back</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};


// --- STYLES MODIFIED FOR FULL-SCREEN "FROSTED GLASS" LAYOUT ---
const styles = StyleSheet.create({
    backgroundImage: { flex: 1,
    width: "100%",
    height: "100%",
    },
    safeArea: { flex: 1 },
    container: { // Renamed from 'modalCard'
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        width: '35%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    leftPanelImage: { width: 180, height: 180, resizeMode: 'contain', marginBottom: 20 },
    leftPanelTitle: { fontSize: 30, fontWeight: 'bold', color: '#000000ff', textAlign: 'center' },
    leftPanelSubtitle: { fontSize: 13, color: '#000000ff', marginTop: 10, opacity: 0.8, letterSpacing: 1 },
    brandName: { fontSize: 15, color: '#000000ff', marginTop: 30, opacity: 0.8 },
    rightPanel: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)', // Semi-transparent
        padding: 25,
        display: 'flex',
        flexDirection: 'column',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000ff' }, // White text
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(20, 2, 2, 0.7)', // Semi-transparent
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    // Added backButton style to avoid missing property error
    backButton: { padding: 6, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
    userText: { marginLeft: 8, marginRight: 8, fontSize: 14, fontWeight: '500' },
    formBody: { flexDirection: 'row', gap: 25, flex: 1 },
    formColumn: { flex: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#000000ff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 5},
    fieldContainer: { marginBottom: 12 },
    labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 5 },
    label: { fontSize: 12, color: '#000000ff', fontWeight: '500' }, // Light text
    fieldIcon: { marginRight: 6 },
    valueBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(14, 1, 1, 0.8)',
    },
    valueText: {
        fontSize: 14,
        color: '#1A202C', // Dark text inside light boxes for contrast
        fontWeight: '500',
    },
    barcodeImage: {
        width: '100%',
        height: 70,
        resizeMode: 'contain',
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Almost solid white
        padding: 5,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#0f0101ff',
    },
    barcodeText: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#000000ff' },
    currentUserText: { textAlign: 'center', fontSize: 13, color: '#000000ff', marginTop: 5, marginBottom: 20 },
    purchaseDetails: { flexDirection: 'row' },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
    },
    saveButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, backgroundColor: 'rgba(234, 234, 234, 0.8)', marginLeft: 15 },
    buttonText: { color: '#000000ff', fontSize: 14, fontWeight: 'bold' },
});

export default AssetFullDetails;