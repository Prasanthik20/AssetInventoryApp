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
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { Asset, baseURL, RootStackParamList } from '../../navigation/types';
import axios from 'axios';
import { globalStyleTokens } from 'src/styles/globalStyles';

interface User {
    id: string;
    name: string;
    employeeId?: string;
    email: string;
    role: string;
    status: string;
    avatarUrl: string;
    assignedAssets: Array<{ id: string; name: string; barcode: string }>;
}

type CompanyUsersNavigationProp = StackNavigationProp<RootStackParamList, 'CompanyUsersScreen'>;

const CompanyUsersScreen: React.FC = () => {
    const { width } = useWindowDimensions();
    const isDesktopWeb = width >= 900;
    const navigation = useNavigation<CompanyUsersNavigationProp>();
    const [companyUsersData, setCompanyUsersData] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [filter, setFilter] = React.useState('All');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [errorText, setErrorText] = React.useState('');

    const roleBadgeMap: Record<string, string> = {
        supervisor: '#0F766E',
        operator: '#2563EB',
        admin: '#7C3AED',
        'super admin': '#7C3AED',
        superadmin: '#7C3AED',
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setErrorText('');
            const [usersResponse, assetsResponse] = await Promise.all([
                axios.get(`${baseURL}/api/auth/users`),
                axios.get(`${baseURL}/api/assets`),
            ]);

            const usersData = usersResponse.data;
            const rawUsers = usersData.users || usersData.data || usersData || [];
            const rawAssets = assetsResponse.data.assets || assetsResponse.data || [];

            const assignedLookup = new Map<string, Array<{ id: string; name: string; barcode: string }>>();
            rawAssets.forEach((a: any) => {
                const assetId = String(a.assetId || a.id || '');
                const assetName = String(a.assetName || a.name || 'Unnamed Asset');
                const assetBarcode = String(a.barcode || a.serialNumber || 'N/A');
                const operatorEmployeeId = String(a.operatorId || a.receiverId || '').trim();
                const assignedName = String(a.assignedTo || '').trim().toLowerCase();

                if (!assetId) return;

                const normalizedAsset = {
                    id: assetId,
                    name: assetName,
                    barcode: assetBarcode,
                };

                const lookupKeys = [
                    operatorEmployeeId ? `emp:${operatorEmployeeId}` : '',
                    assignedName ? `name:${assignedName}` : '',
                ].filter(Boolean);

                lookupKeys.forEach((key) => {
                    const current = assignedLookup.get(key) || [];
                    if (!current.some((item) => item.id === normalizedAsset.id)) {
                        assignedLookup.set(key, [...current, normalizedAsset]);
                    }
                });
            });

            // Map API response to local state structure
            const users: User[] = rawUsers.map((u: any) => {
                const userId = String(u.userId || u.id || '');
                const employeeId = String(u.employeeId || '').trim();
                const fullName = String(u.fullName || u.name || 'Unknown User');
                const nameKey = `name:${fullName.toLowerCase()}`;
                const empKey = employeeId ? `emp:${employeeId}` : '';
                const assetsByEmp = empKey ? assignedLookup.get(empKey) || [] : [];
                const assetsByName = assignedLookup.get(nameKey) || [];
                const mergedAssets = [...assetsByEmp, ...assetsByName].filter(
                    (asset, index, arr) => arr.findIndex((x) => x.id === asset.id) === index,
                );

                return {
                id: userId,
                employeeId,
                name: fullName,
                email: u.email,
                role: u.role?.roleName || 'Unassigned',
                status: 'Active', // default
                avatarUrl: u.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
                assignedAssets: mergedAssets,
            }});

            setCompanyUsersData(users);
        } catch (err) {
            console.error('Error fetching users:', err);
            setErrorText('Failed to load users and assignments.');
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
        <TouchableOpacity
                onPress={() => {
                    navigation.navigate("FieldAssets", {
                        employeeId: item.employeeId?.toString() ?? "",
                        operatorName: item.name,
                    });
        }}>
            <View style={styles.userCard}>
                <View style={styles.cardHeader}>
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userMeta}>{item.email}</Text>
                        <Text style={styles.userMeta}>Employee ID: {item.employeeId || 'N/A'}</Text>
                    </View>
                    <View
                        style={[
                            styles.roleBadge,
                            {
                                backgroundColor:
                                    roleBadgeMap[String(item.role || '').toLowerCase()] || '#475569',
                            },
                        ]}
                    >
                        <Text style={styles.roleText}>{item.role}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#888" style={{ marginLeft: 10 }} />
                </View>

                <View style={styles.assetsSection}>
                    <View style={styles.assetsHeaderRow}>
                        <Text style={styles.assetsTitle}>Assigned Assets</Text>
                        <Text style={styles.assetsCount}>{item.assignedAssets.length}</Text>
                    </View>
                    {item.assignedAssets.length > 0 ? (
                        item.assignedAssets.slice(0, 4).map(asset => (
                            <View key={asset.id} style={styles.assetPill}>
                                <Ionicons name="cube-outline" size={14} color="#334155" />
                                <Text style={styles.assetText}>{asset.name}</Text>
                                <Text style={styles.assetBarcode}>#{asset.barcode}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noAssetsText}>No assigned assets.</Text>
                    )}
                    {item.assignedAssets.length > 4 && (
                        <Text style={styles.moreAssetsText}>+{item.assignedAssets.length - 4} more</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity> // ✅ CORRECT: Closing tag now correctly wraps the entire card
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
                        <Text style={styles.headerTitle}>Users</Text>
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
                    ) : errorText ? (
                        <Text style={styles.errorText}>{errorText}</Text>
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
    backgroundImage: { ...globalStyleTokens.pageBackgroundImage, justifyContent: 'center', alignItems: 'center' },
    safeArea: globalStyleTokens.safeAreaOverlayCentered,
    container: {
        ...globalStyleTokens.shellContainerCard,
        backgroundColor: 'rgba(248, 250, 252, 0.95)',
    },
    header: { ...globalStyleTokens.shellHeaderDark, backgroundColor: 'rgba(30, 41, 59, 0.85)' },
    backButton: { padding: 5 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    addUserButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
    addUserText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
    controlsContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    searchContainer: { ...globalStyleTokens.searchBoxBase, marginBottom: 15 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 45, fontSize: 15 },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
    filterButton: { paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    filterText: { fontWeight: '600' },
    listContainer: { padding: 20 },
    userCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14, borderWidth: 2, borderColor: '#DBEAFE' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    userMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 10 },
    roleText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
    statusIndicator: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },
    assetsSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    assetsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    assetsTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
    assetsCount: { fontSize: 12, fontWeight: '700', color: '#1D4ED8', backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    assetPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
    },
    assetText: { marginLeft: 8, color: '#334155', fontWeight: '600', flex: 1 },
    assetBarcode: { color: '#64748B', fontSize: 12, marginLeft: 8 },
    noAssetsText: { color: '#94A3B8', fontSize: 12 },
    moreAssetsText: { color: '#0F766E', fontSize: 12, fontWeight: '600', marginTop: 2 },
    errorText: { textAlign: 'center', color: '#DC2626', marginTop: 40, fontWeight: '600' },
});

export default CompanyUsersScreen;