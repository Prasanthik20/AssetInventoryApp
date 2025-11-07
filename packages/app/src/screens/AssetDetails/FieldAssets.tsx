import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Mock Data filtered for "In Field" assets
const fieldAssetsData = [
  { id: '1', name: 'Laptop Pro', barcode: 'BAR456', assignedTo: 'Jane D.', dueDate: 'Due Tomorrow' },
  { id: '3', name: 'Safety Vest', barcode: 'BAR901', assignedTo: 'John S.', dueDate: 'Due in 5 days' },
  { id: '5', name: 'Tablet', barcode: 'TAB456', assignedTo: 'Mike R.', dueDate: 'OVERDUE' },
  // ... add more field assets
];

const FieldAssets: React.FC = () => {
    const navigation = useNavigation();

    const renderAsset = ({ item }: { item: typeof fieldAssetsData[0] }) => (
        <View style={styles.assetRow}>
            <Ionicons name="map-outline" size={24} color="#3B59B8" style={styles.assetIcon} />
            <View style={styles.assetInfo}>
                <Text style={styles.assetName}>{item.name} ({item.barcode})</Text>
                <Text style={styles.assetSubtext}>Assigned to: {item.assignedTo}</Text>
            </View>
            <Text style={[styles.assetValue, item.dueDate === 'OVERDUE' && {color: 'red'}]}>{item.dueDate}</Text>
        </View>
    );

    return (
        <ImageBackground source={require("../../assets/Company-bg.webp")} style={styles.backgroundImage} resizeMode="cover" blurRadius={5}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Field Assets</Text>
                        <View style={{width: 40}} />
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
                        <TextInput placeholder="Search by name, user, or barcode..." placeholderTextColor="#888" style={styles.searchInput} />
                    </View>

                    {/* Asset List */}
                    <FlatList
                        data={fieldAssetsData}
                        renderItem={renderAsset}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContainer}
                    />
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

// Reuse the same styles from AssetsDetails.tsx by importing them, or copy-paste the styles object here.
// For brevity, I'll assume you copy the 'styles' object from the first file.
const styles = StyleSheet.create({
    /* PASTE STYLES FROM AssetsDetails.tsx HERE */
    backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
     safeArea: {
        flex: 1,
        width: '100%',
        // Redundant but safe, ensures content is centered
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
         maxWidth: 1100,
        height: '90%',
        backgroundColor: '#F3F4F8', // Solid light background
        borderRadius: 25,
        overflow: 'hidden',
        // Softer shadow to match the image
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(60, 60, 80, 0.6)',
        padding: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 10,
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 45,
        fontSize: 15,
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    assetIcon: {
        marginRight: 15,
    },
    assetInfo: {
        flex: 1,
    },
    assetName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    assetSubtext: {
        fontSize: 13,
        color: '#777',
        marginTop: 2,
    },
    assetValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3B59B8',
    },
});

export default FieldAssets;