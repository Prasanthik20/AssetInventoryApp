import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Mock Data
const availableAssets = [
    { id: 'd1', name: 'Concrete Mixer', barcode: 'CMX-001' },
    { id: 'd2', name: 'Jackhammer', barcode: 'JKH-007' },
    { id: 'd3', name: 'Surveying Theodolite', barcode: 'SRV-003' },
];
const availableOperators = [
    { id: 'op1', name: 'Jane Doe' },
    { id: 'op2', name: 'Mike Richards' },
];

const AssignAssetScreen: React.FC = () => {
    const navigation = useNavigation<any>();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // State for all form fields
    const [selectedAsset, setSelectedAsset] = useState<string | null>('Concrete Mixer (CMX-001)');
    const [selectedOperator, setSelectedOperator] = useState<string | null>('Jane Doe');
    const [projectName, setProjectName] = useState('');
    const [location, setLocation] = useState('');
    const [assignedDate, setAssignedDate] = useState(today);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);

    const handleAssign = () => {
        // ... validation and submission logic ...
    };

    const handleScanBarcode = () => {
        // In a real app, this would open the camera
        Alert.alert("Scan Barcode", "Camera functionality would be implemented here.");
    };

    const handleUploadPhoto = () => {
        // In a real app, this would open the image library
        Alert.alert("Upload Photo", "Image library functionality would be implemented here.");
    };


    return (
        <ImageBackground
            source={require("../../assets/Company-bg.webp")}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={10} // Added blur for better focus
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#1A202C" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Assign Asset to Operator</Text>
                        <View style={{ width: 40 }} /> {/* Spacer */}
                    </View>

                    {/* Form Container with ScrollView */}
                    <ScrollView contentContainerStyle={styles.formScrollContainer}>
                        <View style={styles.formBody}>
                            {/* Left Column */}
                            <View style={styles.formColumn}>
                                <Text style={styles.label}>Select Asset (Available in Office)</Text>
                                <TouchableOpacity style={styles.pickerInput}>
                                    <Text style={styles.pickerText}>{selectedAsset}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#333" />
                                </TouchableOpacity>

                                <Text style={styles.label}>Assign to Operator</Text>
                                <TouchableOpacity style={styles.pickerInput}>
                                    <Text style={styles.pickerText}>{selectedOperator}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#333" />
                                </TouchableOpacity>

                                <Text style={styles.label}>Project Name</Text>
                                <View style={styles.inputGroup}>
                                    <Feather name="briefcase" size={18} color="#555" style={styles.inputIcon} />
                                    <TextInput style={styles.textInput} placeholder="e.g., Highway Expansion Project" value={projectName} onChangeText={setProjectName} />
                                </View>
                                
                                <Text style={styles.label}>Destination / Site Location</Text>
                                <View style={styles.inputGroup}>
                                    <Feather name="map-pin" size={18} color="#555" style={styles.inputIcon} />
                                    <TextInput style={styles.textInput} placeholder="e.g., Downtown Site, Block A" value={location} onChangeText={setLocation} />
                                </View>

                                <Text style={styles.label}>Notes (Optional)</Text>
                                <TextInput style={styles.notesInput} placeholder="Add any relevant notes..." value={notes} onChangeText={setNotes} multiline />
                            </View>

                            {/* Right Column */}
                            <View style={styles.formColumn}>
                                <Text style={styles.label}>Scan Barcode</Text>
                                <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode}>
                                    <MaterialCommunityIcons name="barcode-scan" size={24} color="#fff" />
                                    <Text style={styles.scanButtonText}>Scan Asset Barcode</Text>
                                </TouchableOpacity>
                                
                                <Text style={styles.label}>Assigned Date</Text>
                                <View style={styles.inputGroup}>
                                    <Feather name="calendar" size={18} color="#555" style={styles.inputIcon} />
                                    <TextInput style={styles.textInput} value={assignedDate} onChangeText={setAssignedDate} editable={false} />
                                </View>

                                <Text style={styles.label}>Expected Return Date</Text>
                                <View style={styles.inputGroup}>
                                    <Feather name="calendar" size={18} color="#555" style={styles.inputIcon} />
                                    <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />
                                </View>

                                <Text style={styles.label}>Upload Photo (Optional)</Text>
                                <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto}>
                                    <Feather name="camera" size={20} color="#4A5568" />
                                    <Text style={styles.uploadButtonText}>
                                        {photo ? 'Photo Uploaded' : 'Tap to upload a photo'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer with actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                            <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleAssign}>
                            <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.assignButton}>
                                <Text style={styles.buttonText}>Assign Asset</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

// --- STYLES REVISED FOR NEW LAYOUT AND CLEAN AESTHETIC ---
const styles = StyleSheet.create({
    backgroundImage: { flex: 1 ,
        width: "100%",
        height: "100%",
    },
    safeArea: { flex: 1 },
    container: {
        flex: 1,
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center title
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    backButton: { position: 'absolute', left: 20 },
    headerTitle: { color: '#1A202C', fontSize: 20, fontWeight: 'bold' },
    formScrollContainer: {
        padding: 25,
    },
    formBody: {
        flexDirection: 'row',
        gap: 25,
    },
    formColumn: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        color: '#2D3748',
        marginBottom: 8,
        fontWeight: '600',
    },
    pickerInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#CBD5E0',
    },
    pickerText: {
        fontSize: 15,
        color: '#1A202C',
        fontWeight: '500',
    },
    inputGroup: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    inputIcon: { marginRight: 10 },
    textInput: {
        flex: 1,
        height: 50,
        fontSize: 15,
        color: '#1A202C',
        fontWeight: '500',
    },
    notesInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E0',
        padding: 15,
        fontSize: 15,
        color: '#1A202C',
        height: 125, // Increased height
        textAlignVertical: 'top',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A55A2',
        borderRadius: 10,
        paddingVertical: 14,
        marginBottom: 20,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EDF2F7',
        borderRadius: 10,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#CBD5E0',
    },
    uploadButtonText: {
        color: '#4A5568',
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        marginTop: 'auto', // Push footer to the bottom
    },
    assignButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, marginLeft: 15 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, backgroundColor: '#E2E8F0' },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default AssignAssetScreen;