import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    ImageBackground, 
    FlatList, 
    TouchableOpacity, 
    TextInput, 
    Image, 
    ActivityIndicator 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

interface Asset {
    id: string;
    name: string;
    barcode: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarUrl: string;
    assignedAssets: Asset[];
}

const CompanyUsersScreen: React.FC = () => {
    const navigation = useNavigation<any>();

    const [companyUsersData, setCompanyUsersData] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [filter, setFilter] = React.useState('All');
    const [searchQuery, setSearchQuery] = React.useState('');

    // Fetch users from Next.js API
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/auth/users'); // replace with your API URL
            const data = await response.json();

            // Map API response to local state structure
            const users: User[] = data.users.map((u: any) => ({
                id: u.userId.toString(),
                name: u.fullName,
                email: u.email,
                role: u.role?.roleName || 'Unassigned',
                status: 'Active', // default
                avatarUrl: u.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
                assignedAssets: (u.assignedAssets || []).map((a: any) => ({
                    id: a.id.toString(),
                    name: a.name,
                    barcode: a.barcode
                })),
            }));

            setCompanyUsersData(users);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    // Filter & Search
    const filteredUsers = React.useMemo(() => {
        return companyUsersData
            .filter(user => (filter === 'All' ? true : user.role === filter))
            .filter(user =>
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [filter, searchQuery, companyUsersData]);

    const renderUser = ({ item }: { item: User }) => (
        <View style={styles.userCard}>
            <View style={styles.cardHeader}>
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.role}</Text>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: item.status === 'Active' ? '#28A745' : '#DC3545' }]} />
            </View>

            {/* Assigned Assets */}
            {item.role === 'Operator' && item.assignedAssets.length > 0 && (
                <View style={styles.assetsSection}>
                    <Text style={styles.assetsTitle}>Assigned Assets ({item.assignedAssets.length})</Text>
                    {item.assignedAssets.map(asset => (
                        <View key={asset.id} style={styles.assetItem}>
                            <Ionicons name="cube-outline" size={16} color="#555" />
                            <Text style={styles.assetText}>{asset.name} ({asset.barcode})</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
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
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Company Users</Text>
                        <TouchableOpacity style={styles.addUserButton} onPress={() => navigation.navigate('AddCompanyUser')}>
                            <Ionicons name="add" size={24} color="#fff" />
                            <Text style={styles.addUserText}>Add User</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search & Filter */}
                    <View style={styles.controlsContainer}>
                        <View style={styles.searchContainer}>
                            <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
                            <TextInput
                                placeholder="Search by name or email..."
                                placeholderTextColor="#888"
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <View style={styles.filterContainer}>
                            {['All', 'Supervisor', 'Operator'].map(f => (
                                <TouchableOpacity key={f} onPress={() => setFilter(f)}>
                                    <LinearGradient
                                        colors={filter === f ? ['#6E56B3', '#4A328C'] : ['#FFFFFF', '#F0F0F0']}
                                        style={styles.filterButton}
                                    >
                                        <Text style={[styles.filterText, { color: filter === f ? '#fff' : '#333' }]}>{f}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Users List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#6B46C1" style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            renderItem={renderUser}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContainer}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
    container: {
        width: '90%',
        maxWidth: 1100,
        height: '90%',
        backgroundColor: '#F3F4F8',
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(60, 60, 80, 0.7)', padding: 15 },
    backButton: { padding: 5 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    addUserButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
    addUserText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
    controlsContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 45, fontSize: 15 },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    filterButton: { paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    filterText: { fontWeight: '600' },
    listContainer: { padding: 20 },
    userCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    userEmail: { fontSize: 13, color: '#777', marginTop: 2 },
    roleBadge: { backgroundColor: '#EAEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginLeft: 10 },
    roleText: { color: '#6B46C1', fontWeight: '600', fontSize: 12 },
    statusIndicator: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },
    assetsSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    assetsTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    assetItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    assetText: { marginLeft: 10, color: '#555' },
});

export default CompanyUsersScreen;