import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, TouchableOpacity, Switch, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Define the structure for our new asset data
interface AssetData {
    assetName: string;
    category: string;
    status: string;
    location: string;
    modelNumber: string;
    serialNumber: string;
    purchaseDate: string;
    purchasePrice: string;
    warrantyExpiry: string;
}

const AddEditAsset: React.FC = () => {
    const navigation = useNavigation<any>();
    const [isEnabled, setIsEnabled] = useState(true);

    // Initial state is empty for adding a new asset
    const [assetData, setAssetData] = useState<AssetData>({
        assetName: '',
        category: 'Heavy Machinery',
        status: 'Available',
        location: 'Main Yard',
        modelNumber: '',
        serialNumber: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyExpiry: '',
    });

    const handleInputChange = (field: keyof AssetData, value: string) => {
        setAssetData(prev => ({ ...prev, [field]: value }));
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
                        // --- MODIFICATION: Made gradient semi-transparent ---
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

                    {/* Right Form Panel */}
                    <View style={styles.rightPanel}>
                        {/* Header */}
                        <View style={styles.header}>
                             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#000000ff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Add New Asset</Text>
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

                        {/* Form Body */}
                        <View style={styles.formBody}>
                            {/* Left Column */}
                            <View style={styles.formColumn}>
                                <Text style={styles.sectionTitle}>General Details</Text>

                                <View style={styles.inputGroup}>
                                    <Feather name="truck" size={16} color="#888" style={styles.inputIcon} />
                                    <TextInput style={styles.textInput} placeholder="Asset Name (e.g., Excavator)" value={assetData.assetName} onChangeText={v => handleInputChange('assetName', v)} placeholderTextColor="#555"/>
                                </View>
                                
                                <View style={styles.rowInputContainer}>
                                    <Text style={styles.label}>Category</Text>
                                    <Switch value={isEnabled} onValueChange={setIsEnabled} trackColor={{ false: "#E9E9EA", true: "#81b0ff" }} thumbColor={"#f4f3f4"} style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }} />
                                </View>
                                <TouchableOpacity style={styles.pickerInput}>
                                    <Text style={styles.pickerText}>{assetData.category}</Text>
                                    <Ionicons name="chevron-down" size={18} color="#555" />
                                </TouchableOpacity>

                                <Text style={styles.label}>Status</Text>
                                <TouchableOpacity style={styles.pickerInput}>
                                    <Text style={styles.pickerText}>{assetData.status}</Text>
                                    <Ionicons name="chevron-down" size={18} color="#555" />
                                </TouchableOpacity>

                                <View style={styles.inputGroup}>
                                   <Feather name="archive" size={16} color="#888" style={styles.inputIcon} />
                                   <TextInput style={styles.textInput} placeholder="Model Number" value={assetData.modelNumber} onChangeText={v => handleInputChange('modelNumber', v)} placeholderTextColor="#555" />
                                </View>

                                <View style={styles.inputGroup}>
                                   <Feather name="hash" size={16} color="#888" style={styles.inputIcon} />
                                   <TextInput style={styles.textInput} placeholder="Serial Number" value={assetData.serialNumber} onChangeText={v => handleInputChange('serialNumber', v)} placeholderTextColor="#555" />
                                </View>
                            </View>

                            {/* Right Column */}
                            <View style={styles.formColumn}>
                                {/* <Image source={{ uri: 'https://i.imgur.com/gJuQe3h.png' }} style={styles.barcodeImage} />
                                <Text style={styles.barcodeText}>Assign a new Asset ID</Text> */}

                                <Text style={styles.label}>Current Location</Text>
                                <TouchableOpacity style={styles.pickerInput}>
                                    <Text style={styles.pickerText}>{assetData.location}</Text>
                                    <Ionicons name="chevron-down" size={18} color="#555" />
                                </TouchableOpacity>

                                <Text style={styles.label}>Warranty Expiry</Text>
                                <TextInput style={[styles.textInput, styles.singleTextInput]} placeholder="YYYY-MM-DD" value={assetData.warrantyExpiry} onChangeText={v => handleInputChange('warrantyExpiry', v)} placeholderTextColor="#555" />
                                
                                <Text style={styles.label}>Purchase Date</Text>
                                <TextInput style={[styles.textInput, styles.singleTextInput]} placeholder="YYYY-MM-DD" value={assetData.purchaseDate} onChangeText={v => handleInputChange('purchaseDate', v)} placeholderTextColor="#555" />

                                <Text style={styles.label}>Purchase Price</Text>
                                <TextInput style={[styles.textInput, styles.singleTextInput]} placeholder="Price (e.g., 1500.00)" value={assetData.purchasePrice} onChangeText={v => handleInputChange('purchasePrice', v)} keyboardType="numeric" placeholderTextColor="#555"/>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.footer}>
                            <TouchableOpacity>
                                <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.saveButton}>
                                    <Text style={styles.buttonText}>CREATE ASSET</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                                <Text style={[styles.buttonText, { color: '#555' }]}>Cancel</Text>
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
    backButton: { position: 'absolute', left: 0, zIndex: 1, padding: 10 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000ff', textAlign: 'center', flex: 1 },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    userText: { marginLeft: 8, marginRight: 8, fontSize: 14, fontWeight: '500' },
    formBody: { flexDirection: 'row', gap: 25, flex: 1 },
    formColumn: { flex: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#000000ff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 5},
    label: { fontSize: 12, color: '#000000ff', marginBottom: 4, fontWeight: '500', marginLeft: 5 },
    textInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        color: '#1A202C',
        fontWeight: '500',
    },
    singleTextInput: {
        marginBottom: 12,
    },
    inputGroup: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    inputIcon: { marginRight: 8 },
    pickerInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    pickerText: { color: '#1A202C', fontSize: 14, fontWeight: '500' },
    rowInputContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    barcodeImage: {
        width: '100%',
        height: 70,
        resizeMode: 'contain',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 5,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    barcodeText: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#fff' },
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
    buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default AddEditAsset;