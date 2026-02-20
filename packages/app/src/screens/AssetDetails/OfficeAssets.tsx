import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { baseURL } from 'src/navigation/types';

interface Asset {
  id: number;
  assetName: string;
  barcode: string;
  serialNumber: string;
  category: string;
  status: string;
  assignedBy: string | null;
  assignedTo: string | null;
  location: string;
  purchaseDate: string;
  warrantyExpiry: string;
  price: number;
}


const OfficeAssets: React.FC = () => {
  const navigation = useNavigation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = async () => {
    try {
      const res = await fetch(`${baseURL}/api/assets`);
      const data = await res.json();

      // Filter for Unassigned assets (Office)
      const officeAssets = data.assets.filter((asset: Asset) => asset.status === 'Unassigned');
      setAssets(officeAssets);
    } catch (err) {
      console.error('Error fetching office assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const renderAsset = ({ item }: { item: Asset }) => (
    <View style={styles.assetRow}>
      <Ionicons name="business-outline" size={24} color="#3B59B8" style={styles.assetIcon} />
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>{item.assetName} ({item.barcode})</Text>
        <Text style={styles.assetSubtext}>Last User: {item.assignedTo || 'N/A'}</Text>
      </View>
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
                        <Text style={styles.headerTitle}>Assets In Office</Text>
                        <View style={{width: 40}} />
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
                        <TextInput placeholder="Search by name or barcode..." placeholderTextColor="#888" style={styles.searchInput} />
                    </View>

                    {/* Asset List */}
                    <FlatList
                        data={assets}
                        renderItem={renderAsset}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                    />
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

// Reuse the same styles from AssetsDetails.tsx by importing them, or copy-paste the styles object here.
// For brevity, I'll assume you copy the 'styles' object from the previous file.
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3B59B8',
    },
});


export default OfficeAssets;