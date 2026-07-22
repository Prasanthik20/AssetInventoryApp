import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    TouchableOpacity,
    RefreshControl,
    Switch,
    FlatList,
    ScrollView,
    Platform,
    Image,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
    useNavigation,
    useRoute,
    RouteProp,
    useFocusEffect,
} from '@react-navigation/native';
import axios from 'axios';
import OverdueNotificationModal from '../CommonScreen/OverdueNotificationModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { baseURL, RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { opratorStyles } from './operator.styles';
import AppSnackbar from 'src/components/common/AppSnackbar';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { StatMetricCard } from '../../components/dashboard/StatMetricCard';
import { AssetDistributionWidget } from '../../components/dashboard/AssetDistributionWidget';
import { AssetHealthWidget } from '../../components/dashboard/AssetHealthWidget';
import { QuickActionsPanel } from '../../components/dashboard/QuickActionsPanel';

type DashboardNavigationProp = StackNavigationProp<
    RootStackParamList,
    'OperatorDashboard'
>;
type OperatorDashboardNavigationProp = StackNavigationProp<
    RootStackParamList,
    'OperatorDashboard'
>;

type Props = {
    user: any;
    setUser: React.Dispatch<React.SetStateAction<any>>;
    navigation: OperatorDashboardNavigationProp;
};

// Define the structure of a Notification from the API
interface Notification {
    id: number;
    notificationId?: number;
    reason: string;
    status: string;
    reply: string;
    createdAt: string;
    asset: {
        id: number;
        name: string;
    };
    sender: {
        employeeId: number;
        name: string;
    };
    receiver: {
        employeeId: number;
        name: string;
    };
}

const parseReplyPayload = (rawReply?: string | null): { message: string; proofPhotos: string[] } => {
    if (!rawReply) return { message: '', proofPhotos: [] };
    try {
        const parsed = JSON.parse(rawReply);
        if (parsed && typeof parsed === 'object') {
            const message = typeof parsed.message === 'string' ? parsed.message : rawReply;
            const proofPhotos = Array.isArray(parsed.proofPhotos)
                ? parsed.proofPhotos.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
                : [];
            return { message, proofPhotos };
        }
        return { message: rawReply, proofPhotos: [] };
    } catch {
        return { message: rawReply, proofPhotos: [] };
    }
};

const isAssignmentNotification = (notification: Notification): boolean => {
    const reason = String(notification.reason || '').toLowerCase();
    return reason.includes('assigned to you');
};

interface LocationStat {
    location: string;
    count: number;
}

const OperatorDashboard: React.FC<Props> = ({ user, setUser, navigation }) => {
    const { width, height } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 900;
    const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;
    const route = useRoute<RouteProp<RootStackParamList, 'OperatorDashboard'>>();
    const styles = opratorStyles({ width, height });
    // ----------------------------
    // 🔹 Get operator data
    // ----------------------------
    const [overdueCount, setOverdueCount] = useState(0);

    // ----------------------------
    // 🔹 Backend Data States
    // ----------------------------
    const [myAssets, setMyAssets] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [assignedCount, setAssignedCount] = useState(0);
    const [currentLocation, setCurrentLocation] = useState('N/A');
    const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showAllAssets, setShowAllAssets] = useState(false);
    const [showAllReturnedAssets, setShowAllReturnedAssets] = useState(false);
    const [showAllPendingNotifications, setShowAllPendingNotifications] =
        useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        assetName: string;
        onSubmit: (reason: string, proofImages?: string[]) => void;
        requireProofImages?: boolean;
    }>({
        title: '',
        assetName: '',
        onSubmit: () => { },
        requireProofImages: false,
    });
    const [snackbar, setSnackbar] = useState<{
        visible: boolean;
        message: string;
        kind: 'success' | 'error' | 'info';
    }>({ visible: false, message: '', kind: 'info' });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showSnackbar = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSnackbar({ visible: true, message, kind });
        timeoutRef.current = setTimeout(() => {
            setSnackbar((prev) => ({ ...prev, visible: false }));
        }, 3200);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchOperatorData(); // This re-runs your API calls to get updated dates
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        // Clear local data
        setNotifications([]);
        setMyAssets([]);
        await AsyncStorage.removeItem('user');
        // setAppUser(null);
        // Clear user → App.tsx will show AuthStack automatically
        setUser?.(null);
    };

    // ----------------------------
    // 🔹 Fetch operator assets
    // ----------------------------
    const fetchOperatorData = async () => {
        if (!user?.employeeId) return;
        try {
            const [assetsRes, notificationsRes] = await Promise.all([
                axios.get(
                    `${baseURL}/api/my-assets?id=${user.employeeId}`,
                ),
                axios.get(
                    `${baseURL}/api/notifications/user?id=${user.employeeId}`,
                ),
            ]);
            //const data = await res.json();

            const rawAssets = assetsRes.data.assets || [];
            const normalizedAssets = rawAssets.map((a: any) => ({
                ...a,
                assignedBy: a.assignedBy || a.assigned_by || a.senderId,
                assetId: a.assetId || a.id,
                serialNumber: a.serialNumber || a.serialNo || a.s_n || a.serial_number,
            }));

            const activeAssets = normalizedAssets.filter((asset: any) => {
                const normalizedStatus = String(asset?.status || '').toLowerCase();
                return normalizedStatus === 'assigned' || normalizedStatus === 'overdue';
            });

            const overdueAssets = activeAssets.filter((a: any) =>
                String(a?.status || '').toLowerCase() === 'overdue' ||
                isAssetOverdue(a.expectedReturnDate),
            );

            // Build location-wise counts from fetched assets.
            const locationCounts = activeAssets.reduce(
                (acc: Record<string, number>, asset: any) => {
                    const locationKey =
                        (asset?.location || 'Unknown').toString().trim() || 'Unknown';
                    acc[locationKey] = (acc[locationKey] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>,
            );

            const locationEntries = (Object.entries(locationCounts) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([location, count]) => ({
                    location,
                    count: Number(count),
                }));

            setMyAssets(normalizedAssets);
            setOverdueCount(overdueAssets.length);
            setAssignedCount(activeAssets.length);
            setCurrentLocation(locationEntries[0]?.location || 'N/A');
            setLocationStats(locationEntries);
            const mappedNotifications = (notificationsRes.data.notifications || [])
                .map((n: any) => {
                    console.log('Raw Notification from API:', n);
                    return {
                        id: n.id,
                        reason: n.reason,
                        status: n.status, // Ensure status is mapped
                        reply: n.reply,
                        createdAt: n.created_at,
                        asset: {
                            id: n.assetId,
                            name: n.assetName || (n.asset ? n.asset.name : 'Unknown Asset'),
                        },
                        sender: {
                            employeeId: n.senderId || n.sender?.employeeId,
                            name:
                                n.senderName || (n.sender ? n.sender.fullName : 'Supervisor'),
                        },
                        receiver: {
                            employeeId: n.receiverId || n.receiver?.employeeId,
                            name:
                                n.receiverName ||
                                (n.receiver ? n.receiver.fullName : 'Operator'),
                        },
                    };
                }) // End of .map()
                .sort((a: Notification, b: Notification) => {
                    const aTime = new Date(a.createdAt || 0).getTime();
                    const bTime = new Date(b.createdAt || 0).getTime();
                    return bTime - aTime;
                });

            setNotifications(mappedNotifications);
        } catch (err) {
            console.log('Operator Assets API Error:', err);
        }
    };

    useEffect(() => {
        if (route.params?.refresh) {
            console.log('🔄 Return detected, refreshing dashboard data...');
            fetchOperatorData();

            // Clear the refresh param so it doesn't loop
            navigation.setParams({ refresh: undefined } as any);
        }
    }, [route.params?.refresh]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const refreshData = async () => {
                if (user?.employeeId && isActive) {
                    await fetchOperatorData();
                }
            };

            refreshData();

            return () => {
                isActive = false;
            };
        }, [user?.employeeId]), // This is correct, but ensure fetchOperatorData is fresh
    );

    // ----------------------------
    // 🔹 Modal Handlers
    // ----------------------------
    const handleOpenModal = (config: {
        title: string;
        assetName: string;
        onSubmit: (reason: string, proofImages?: string[]) => void;
        requireProofImages?: boolean;
    }) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const handleCloseModal = () => setModalVisible(false);

    const hideNotification = async (id: number) => {
        try {
            await axios.put(`${baseURL}/api/notifications/hide`, { id });
            setNotifications((prev) => prev.filter((item) => item.id !== id));
            showSnackbar('Notification marked as read.', 'success');
        } catch (error) {
            console.error('Hide notification error:', error);
            showSnackbar('Could not mark notification as read.', 'error');
        }
    };

    // Update the signature to accept the asset object
    const handleOverdueSubmit = async (reason: string, selectedAsset?: any) => {
        // Use either the passed asset or find it by name as a fallback
        console.log('Submitting for asset:', modalConfig.assetName);
        const asset =
            selectedAsset ||
            myAssets.find(a => a.assetName === modalConfig.assetName);

        if (!asset || (!asset.assignedBy && !asset.assigned_by)) {
            console.error('Missing Supervisor ID. Asset data:', asset);
            console.error('Critical: No asset context found for submission');
            showSnackbar('Could not identify which asset to update.', 'error');
            return;
        }

        try {
            const payload = {
                assetId: asset.assetId,
                assignmentId: asset.assignmentId || null,
                operatorId: Number(user?.employeeId),
                supervisorId: asset.assignedBy || asset.assigned_by,
                reason: reason,
            };
            console.log('DEBUG PAYLOAD:', payload);
            console.log('🚀 Sending notification for:', asset.assetName);

            const response = await axios.post(
                `${baseURL}/api/notifications/overdue`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (response.status === 200) {
                showSnackbar('Extension request sent to your supervisor.', 'success');
                handleCloseModal();
                fetchOperatorData(); // Refresh to ensure synchronization
            }
        } catch (error: any) {
            console.error(
                'Overdue send error:',
                error.response?.data || error.message,
            );
            showSnackbar('Failed to reach server.', 'error');
        }
    };

    const handleReplySubmit = async (
        replyMessage: string,
        notification: Notification,
        proofImages?: string[],
    ) => {
        // The 'sender' of the original alert is the 'receiver' of this reply
        const supervisorId = notification.sender?.employeeId;
        const operatorId = user?.employeeId; // Current logged-in user

        if (!supervisorId || !operatorId) {
            showSnackbar('Required user information is missing. Please refresh.', 'error');
            console.error('IDs missing:', { supervisorId, operatorId });
            return;
        }

        try {
            const payload = {
                originalNotificationId: Number(notification.id),
                replyMessage,
                senderId: Number(operatorId), // Operator sending the reply
                receiverId: Number(supervisorId), // Supervisor receiving the reply
                status: 'replied', // New status
                ...(proofImages && proofImages.length > 0 ? { proofPhotos: proofImages } : {}),
            };

            await axios.post(`${baseURL}/api/notifications/reply`, payload);
            // Move this item to history immediately in UI by marking it as replied.
            const localReply = proofImages && proofImages.length > 0
                ? JSON.stringify({
                    kind: 'asset_receipt_confirmation',
                    message: replyMessage,
                    proofCount: proofImages.length,
                    proofPhotos: proofImages,
                })
                : replyMessage;

            setNotifications(prev =>
                prev.map(item =>
                    item.id === notification.id
                        ? { ...item, reply: localReply, status: 'replied' }
                        : item,
                ),
            );
            showSnackbar('Reply sent successfully!', 'success');
            handleCloseModal();
            fetchOperatorData(); // Refresh to see the status change
        } catch (error: any) {
            console.error('Reply Error:', error.response?.data || error.message);
            showSnackbar('Could not send reply. Check server logs.', 'error');
        }
    };

    // 🔥 Enhanced check to ensure we don't mark items as overdue if they are returned
    const isAssetOverdue = (expectedReturnDate?: string | null) => {
        if (!expectedReturnDate) return false;

        // 🇮🇳 Get current time in IST
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istToday = new Date(
            now.getTime() + now.getTimezoneOffset() * 60000 + istOffset,
        );
        istToday.setHours(0, 0, 0, 0);

        // 📅 Parse the date provided (could be original or extended)
        const returnDate = new Date(expectedReturnDate);
        const istReturnDate = new Date(
            returnDate.getTime() + returnDate.getTimezoneOffset() * 60000 + istOffset,
        );
        istReturnDate.setHours(0, 0, 0, 0);

        // Returns true only if the date is strictly in the past
        return istReturnDate < istToday;
    };

    const getUpdatedReturnDate = (assetId: number) => {
        const n = notifications.find(
            x =>
                x.asset.id === assetId &&
                (x.reason?.toLowerCase().includes('extension approved') || // Matches your backend 'reason'
                    x.reply?.toLowerCase().includes('extended')), // Matches your backend 'reply'
        );

        if (!n) return null;

        // Instead of trying to find a date string which isn't there,
        // we return a flag or the original date to indicate it is now valid.
        return 'extended';
    };

    const pendingReplyNotifications = notifications.filter(item => {
        const isFromSupervisor =
            Number(item.sender?.employeeId) !== Number(user?.employeeId);
        const hasReply = !!item.reply && item.reply.trim().length > 0;
        const isResolved = item.status === 'resolved';
        const isConfirmed = ['received', 'confirmed'].includes(
            String(item.status || '').toLowerCase(),
        );
        return isFromSupervisor && !hasReply && !isResolved && !isConfirmed;
    });

    const activeAssets = myAssets.filter((asset: any) => {
        const normalizedStatus = String(asset?.status || '').toLowerCase();
        return normalizedStatus === 'assigned' || normalizedStatus === 'overdue';
    });

    const returnedAssets = myAssets.filter((asset: any) =>
        String(asset?.status || '').toLowerCase() === 'returned',
    );

    const visibleMyAssets = showAllAssets ? activeAssets : activeAssets.slice(0, 5);
    const visibleReturnedAssets = showAllReturnedAssets
        ? returnedAssets
        : returnedAssets.slice(0, 5);
    const visiblePendingNotifications = showAllPendingNotifications
        ? pendingReplyNotifications
        : pendingReplyNotifications.slice(0, 5);

    const historyNotifications = notifications.filter(item => {
        const isFromSupervisor =
            Number(item.sender?.employeeId) !== Number(user?.employeeId);
        const hasReply = !!item.reply && item.reply.trim().length > 0;
        const isResolved = item.status === 'resolved';
        const isConfirmed = ['received', 'confirmed'].includes(
            String(item.status || '').toLowerCase(),
        );
        return !isFromSupervisor || hasReply || isResolved || isConfirmed;
    });

    const visibleHistoryNotifications = showAllHistory
        ? historyNotifications
        : historyNotifications.slice(0, 5);

    return (
        <ImageBackground
            source={require('../../assets/Company-bg.webp')}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={5}
        >
            <SafeAreaView style={styles.safeArea}>
                <DashboardHeader
                    companyName={user?.operatorName || user?.fullName || 'Employee Portal'}
                    userName={user?.fullName || 'Employee'}
                    userRole="Employee / User"
                    onLogout={handleLogout}
                />

                <ScrollView
                    style={styles.rightPanel}
                    contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#22D3EE']}
                            tintColor={'#22D3EE'}
                        />
                    }
                >
                    {/* 1. Stat Cards Row */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        <StatMetricCard
                            title="MY ASSIGNED ASSETS"
                            count={assignedCount}
                            iconName="hardware-chip-outline"
                            accentColor="#22D3EE"
                        />
                        <StatMetricCard
                            title="RETURNED ASSETS"
                            count={historyNotifications.length}
                            iconName="checkmark-circle-outline"
                            accentColor="#34D399"
                        />
                        <StatMetricCard
                            title="OVERDUE ASSETS"
                            count={overdueCount}
                            iconName="alert-circle-outline"
                            accentColor="#FB7185"
                        />
                    </View>

                    {/* 2. Quick Actions Panel */}
                    <View style={{ marginBottom: 16 }}>
                        <QuickActionsPanel
                            actions={[
                                {
                                    id: 'return',
                                    label: 'Initiate Asset Return',
                                    iconName: 'return-down-back-outline',
                                    variant: 'primary',
                                    onPress: () => navigation.navigate('ReturnAsset', {
                                        assets: activeAssets,
                                        operatorEmployeeId: user?.employeeId,
                                    }),
                                },
                            ]}
                        />
                    </View>
                        <View
                            style={[
                                styles.dashboardTwoColumnRow,
                                !isMobileLayout && styles.dashboardTwoColumnRowWeb,
                            ]}
                        >
                            {/* ASSETS */}
                            <View
                                style={[
                                    styles.assetsSection,
                                    styles.dashboardColumn,
                                    !isMobileLayout && styles.dashboardColumnWeb,
                                ]}
                            >
                                <View style={styles.notificationsHeaderRow}>
                                    <Text style={styles.sectionTitle}>My Assets</Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            navigation.navigate('ReturnAsset', {
                                                assets: activeAssets,
                                                operatorEmployeeId: user?.employeeId,
                                            })
                                        }
                                    >
                                        <LinearGradient
                                            colors={['#0EA5E9', '#0F766E']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.returnButtonCompact}
                                        >
                                            <Text style={styles.returnButtonCompactText}>
                                                RETURN ASSET
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                                {activeAssets.length === 0 ? (
                                    <Text style={{ color: '#A9C6E4', marginTop: 10 }}>
                                        No assets assigned.
                                    </Text>
                                ) : (
                                    visibleMyAssets.map((asset, index) => {
                                        const updatedReturnDate = getUpdatedReturnDate(
                                            asset.assetId,
                                        );
                                        const rawDate =
                                            updatedReturnDate || asset.expectedReturnDate;

                                        // 🔥 IST Consistent Formatting
                                        const formattedDate = rawDate
                                            ? new Date(rawDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                timeZone: 'Asia/Kolkata',
                                            })
                                            : 'No due date';
                                        const isOverdue = rawDate && isAssetOverdue(rawDate);
                                        const isExtended = Boolean(updatedReturnDate);

                                        return (
                                            <View style={styles.assetItem} key={index}>
                                                <View style={styles.assetIconBg}>
                                                    <Ionicons
                                                        name="cube-outline"
                                                        size={20}
                                                        color="#22D3EE"
                                                    />
                                                </View>

                                                <View style={styles.assetNameContainer}>
                                                    <Text style={styles.assetName}>
                                                        {asset.assetName}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 11,
                                                            color: '#A9C6E4',
                                                            marginTop: 2,
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        Read-only details
                                                    </Text>

                                                    {/* 👇 Displaying Serial Number and Barcode */}
                                                    <View style={{ flexDirection: 'row', marginTop: 2 }}>
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                color: '#A9C6E4',
                                                                fontWeight: '500',
                                                            }}
                                                        >
                                                            S/N:{' '}
                                                            <Text style={{ color: '#E6F3FF' }}>
                                                                {asset.serialNo || 'N/A'}
                                                            </Text>
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                color: '#A9C6E4',
                                                                marginLeft: 10,
                                                                fontWeight: '500',
                                                            }}
                                                        >
                                                            Barcode:{' '}
                                                            <Text style={{ color: '#E6F3FF' }}>
                                                                {asset.barcode}
                                                            </Text>
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 12, color: '#A9C6E4', marginTop: 2 }}>
                                                        Location: <Text style={{ color: '#E6F3FF' }}>{asset.location || 'N/A'}</Text>
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: '#A9C6E4', marginTop: 2 }}>
                                                        Assigned By: <Text style={{ color: '#E6F3FF' }}>{asset.assignedBy || 'N/A'}</Text>
                                                    </Text>
                                                </View>
                                                <View style={styles.dueDateContainer}>
                                                    <Text
                                                        style={[
                                                            styles.assetDueDate,
                                                            isOverdue
                                                                ? { color: '#F97373', fontWeight: 'bold' }
                                                                : isExtended
                                                                    ? { color: '#34D399', fontWeight: 'bold' }
                                                                    : {},
                                                        ]}
                                                    >
                                                        {isOverdue
                                                            ? 'OVERDUE'
                                                            : isExtended
                                                                ? `Extended: ${formattedDate}`
                                                                : formattedDate}
                                                    </Text>

                                                    {/* Only show "Update" if it's overdue AND hasn't been extended yet today */}
                                                    {isOverdue && !isExtended && (
                                                        <TouchableOpacity
                                                            style={styles.notifyButton}
                                                            onPress={() => {
                                                                handleOpenModal({
                                                                    title: 'Extension Request',
                                                                    assetName: asset.assetName,
                                                                    onSubmit: reason =>
                                                                        handleOverdueSubmit(reason, asset),
                                                                });
                                                            }}
                                                        >
                                                            <Text style={styles.notifyButtonText}>
                                                                Update
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })
                                )}

                                {activeAssets.length > 5 && (
                                    <TouchableOpacity
                                        style={styles.showMoreButton}
                                        onPress={() => setShowAllAssets(prev => !prev)}
                                    >
                                        <Text style={styles.showMoreText}>
                                            {showAllAssets
                                                ? 'Show Less'
                                                : `Show More (${activeAssets.length - 5} more)`}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <Text style={[styles.subSectionTitle, { marginTop: 14 }]}>Returned History</Text>
                                {returnedAssets.length === 0 ? (
                                    <Text style={styles.noItemsText}>No returned assets yet.</Text>
                                ) : (
                                    visibleReturnedAssets.map((asset, index) => {
                                        const returnedOn = asset.returnedDate
                                            ? new Date(asset.returnedDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                timeZone: 'Asia/Kolkata',
                                            })
                                            : 'N/A';

                                        return (
                                            <View style={styles.assetItem} key={`returned-${asset.assignmentId || index}`}>
                                                <View style={styles.assetIconBg}>
                                                    <Ionicons name="checkmark-done-circle-outline" size={20} color="#34D399" />
                                                </View>
                                                <View style={styles.assetNameContainer}>
                                                    <Text style={styles.assetName}>{asset.assetName}</Text>
                                                    <Text style={{ fontSize: 12, color: '#A9C6E4', marginTop: 2 }}>
                                                        Returned On: <Text style={{ color: '#E6F3FF' }}>{returnedOn}</Text>
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: '#A9C6E4', marginTop: 2 }}>
                                                        Status: <Text style={{ color: '#34D399', fontWeight: '700' }}>{asset.status || 'Returned'}</Text>
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}

                                {returnedAssets.length > 5 && (
                                    <TouchableOpacity
                                        style={styles.showMoreButton}
                                        onPress={() => setShowAllReturnedAssets(prev => !prev)}
                                    >
                                        <Text style={styles.showMoreText}>
                                            {showAllReturnedAssets
                                                ? 'Show Less'
                                                : `Show More (${returnedAssets.length - 5} more)`}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* NOTIFICATIONS */}
                            <View
                                style={[
                                    styles.assetsSection,
                                    styles.dashboardColumn,
                                    !isMobileLayout && styles.dashboardColumnWeb,
                                ]}
                            >
                                <View style={styles.notificationsHeaderRow}>
                                    <Text style={styles.sectionTitle}>Notifications</Text>
                                    {/* <Text style={styles.subSectionTitle}>Reply To Supervisor</Text> */}
                                </View>
                                <View
                                    style={[
                                        styles.replyRowContainer,
                                        !isMobileLayout && styles.replyRowContainerWeb,
                                    ]}
                                >
                                    {pendingReplyNotifications.length === 0 ? (
                                        <Text style={styles.noItemsText}>No pending replies.</Text>
                                    ) : (
                                        <ScrollView
                                            style={styles.notificationsInnerScroll}
                                            contentContainerStyle={styles.notificationsInnerScrollContent}
                                            nestedScrollEnabled
                                            showsVerticalScrollIndicator
                                        >
                                            {visiblePendingNotifications.map(item => {
                                                const isFromSupervisor =
                                                    Number(item.sender.employeeId) !==
                                                    Number(user?.employeeId);
                                                const isResolved = item.status === 'resolved';
                                                const hasReplied = !!item.reply && item.reply.length > 0;
                                                const isConfirmed = ['received', 'confirmed'].includes(
                                                    String(item.status || '').toLowerCase(),
                                                );

                                                return (
                                                    <View
                                                        key={item.id.toString()}
                                                        style={[
                                                            styles.notificationItem,
                                                            !isMobileLayout && styles.replyRowItemWeb,
                                                            isFromSupervisor
                                                                ? {
                                                                    backgroundColor: 'rgba(14, 165, 233, 0.14)',
                                                                    borderColor: 'rgba(34, 211, 238, 0.35)',
                                                                    borderWidth: 1,
                                                                }
                                                                : {},
                                                            isResolved && {
                                                                opacity: 0.5,
                                                                backgroundColor: 'rgba(18, 45, 73, 0.7)',
                                                            },
                                                        ]}
                                                    >
                                                        <Ionicons
                                                            name={
                                                                isResolved
                                                                    ? 'checkmark-done-circle'
                                                                    : isFromSupervisor
                                                                        ? 'checkmark-circle-outline'
                                                                        : 'notifications-outline'
                                                            }
                                                            size={24}
                                                            color={
                                                                isResolved
                                                                    ? '#999'
                                                                    : isFromSupervisor
                                                                        ? '#22D3EE'
                                                                        : '#22D3EE'
                                                            }
                                                        />

                                                        <View style={styles.notificationContent}>
                                                            <Text
                                                                style={[
                                                                    styles.notificationReason,
                                                                    {
                                                                        color: isResolved ? '#6b7280' : '#A9C6E4',
                                                                        textTransform: 'capitalize',
                                                                    },
                                                                ]}
                                                            >
                                                                Status: {item.status || 'unread'}
                                                            </Text>
                                                            <Text
                                                                style={[
                                                                    styles.notificationText,
                                                                    isResolved && { color: '#999' },
                                                                ]}
                                                            >
                                                                {isFromSupervisor ? (
                                                                    <Text
                                                                        style={{
                                                                            color: '#22D3EE',
                                                                            fontWeight: 'bold',
                                                                        }}
                                                                    >
                                                                        Update from Supervisor:
                                                                    </Text>
                                                                ) : (
                                                                    <Text>
                                                                        Your Request for{' '}
                                                                        <Text style={{ fontWeight: 'bold' }}>
                                                                            {item.asset.name}
                                                                        </Text>
                                                                        :
                                                                    </Text>
                                                                )}
                                                            </Text>
                                                            <Text
                                                                style={[
                                                                    styles.notificationReason,
                                                                    isResolved && {
                                                                        color: '#999',
                                                                        fontStyle: 'italic',
                                                                    },
                                                                ]}
                                                            >
                                                                "{item.reason}"
                                                            </Text>

                                                            {hasReplied && (
                                                                <>
                                                                    <Text style={styles.repliedText}>
                                                                        <Text style={{ fontWeight: 'bold' }}>
                                                                            Message:{' '}
                                                                        </Text>
                                                                        "{parseReplyPayload(item.reply).message}"
                                                                    </Text>
                                                                    {parseReplyPayload(item.reply).proofPhotos.length > 0 && (
                                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                                                            {parseReplyPayload(item.reply).proofPhotos.map((uri, idx) => (
                                                                                <Image
                                                                                    key={`pending-proof-${item.id}-${idx}`}
                                                                                    source={{ uri }}
                                                                                    style={{ width: 56, height: 56, borderRadius: 8, marginRight: 8 }}
                                                                                />
                                                                            ))}
                                                                        </ScrollView>
                                                                    )}
                                                                </>
                                                            )}
                                                        </View>

                                                        {isFromSupervisor && !hasReplied && !isResolved && !isConfirmed && (
                                                            <TouchableOpacity
                                                                style={styles.replyButton}
                                                                onPress={() =>
                                                                    handleOpenModal({
                                                                        title: isAssignmentNotification(item)
                                                                            ? 'Confirm Asset Receipt'
                                                                            : 'Reply to Supervisor',
                                                                        assetName: item.asset.name,
                                                                        requireProofImages: isAssignmentNotification(item),
                                                                        onSubmit: (replyMessage, proofImages) =>
                                                                            handleReplySubmit(replyMessage, item, proofImages),
                                                                    })
                                                                }
                                                            >
                                                                <Text style={styles.replyButtonText}>
                                                                    {isAssignmentNotification(item) ? 'Confirm' : 'Reply'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}

                                                        <TouchableOpacity
                                                            style={styles.replyButton}
                                                            onPress={() => hideNotification(item.id)}
                                                        >
                                                            <Text style={styles.replyButtonText}>Mark as Read</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>

                                {pendingReplyNotifications.length > 5 && (
                                    <TouchableOpacity
                                        style={styles.showMoreButton}
                                        onPress={() =>
                                            setShowAllPendingNotifications(prev => !prev)
                                        }
                                    >
                                        <Text style={styles.showMoreText}>
                                            {showAllPendingNotifications
                                                ? 'Show Less'
                                                : `Show More (${pendingReplyNotifications.length - 5
                                                } more)`}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>
                                    History
                                </Text>
                                {historyNotifications.length === 0 ? (
                                    <Text style={styles.noItemsText}>
                                        No history notifications.
                                    </Text>
                                ) : (
                                    <ScrollView
                                        style={styles.notificationsInnerScroll}
                                        contentContainerStyle={styles.notificationsInnerScrollContent}
                                        nestedScrollEnabled
                                        showsVerticalScrollIndicator
                                    >
                                        {visibleHistoryNotifications.map(item => {
                                            const isFromSupervisor =
                                                Number(item.sender.employeeId) !==
                                                Number(user?.employeeId);
                                            const isResolved = item.status === 'resolved';
                                            const hasReplied = !!item.reply && item.reply.length > 0;

                                            return (
                                                <View
                                                    key={`history-${item.id.toString()}`}
                                                    style={[
                                                        styles.notificationItem,
                                                        isFromSupervisor
                                                            ? {
                                                                backgroundColor: 'rgba(148, 163, 184, 0.14)',
                                                                borderColor: 'rgba(148, 163, 184, 0.35)',
                                                                borderWidth: 1,
                                                            }
                                                            : {},
                                                        isResolved && {
                                                            opacity: 0.75,
                                                            backgroundColor: 'rgba(18, 45, 73, 0.7)',
                                                        },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={
                                                            isResolved
                                                                ? 'checkmark-done-circle'
                                                                : hasReplied
                                                                    ? 'checkmark-circle'
                                                                    : 'notifications-outline'
                                                        }
                                                        size={24}
                                                        color={
                                                            isResolved
                                                                ? '#6b7280'
                                                                : hasReplied
                                                                    ? '#34D399'
                                                                    : '#22D3EE'
                                                        }
                                                    />

                                                    <View style={styles.notificationContent}>
                                                        <Text
                                                            style={[
                                                                styles.notificationReason,
                                                                {
                                                                    color: isResolved ? '#6b7280' : '#A9C6E4',
                                                                    textTransform: 'capitalize',
                                                                },
                                                            ]}
                                                        >
                                                            Status: {item.status || 'unread'}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.notificationText,
                                                                isResolved && { color: '#6b7280' },
                                                            ]}
                                                        >
                                                            {isFromSupervisor ? (
                                                                <Text
                                                                    style={{ color: '#A9C6E4', fontWeight: 'bold' }}
                                                                >
                                                                    Supervisor Update:
                                                                </Text>
                                                            ) : (
                                                                <Text>
                                                                    Your Request for{' '}
                                                                    <Text style={{ fontWeight: 'bold' }}>
                                                                        {item.asset.name}
                                                                    </Text>
                                                                    :
                                                                </Text>
                                                            )}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.notificationReason,
                                                                isResolved && {
                                                                    color: '#6b7280',
                                                                    fontStyle: 'italic',
                                                                },
                                                            ]}
                                                        >
                                                            "{item.reason}"
                                                        </Text>

                                                        {hasReplied && (
                                                            <>
                                                                <Text style={styles.repliedText}>
                                                                    <Text style={{ fontWeight: 'bold' }}>
                                                                        Reply Sent:{' '}
                                                                    </Text>
                                                                    "{parseReplyPayload(item.reply).message}"
                                                                </Text>
                                                                {parseReplyPayload(item.reply).proofPhotos.length > 0 && (
                                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                                                        {parseReplyPayload(item.reply).proofPhotos.map((uri, idx) => (
                                                                            <Image
                                                                                key={`history-proof-${item.id}-${idx}`}
                                                                                source={{ uri }}
                                                                                style={{ width: 56, height: 56, borderRadius: 8, marginRight: 8 }}
                                                                            />
                                                                        ))}
                                                                    </ScrollView>
                                                                )}
                                                            </>
                                                        )}

                                                        <TouchableOpacity
                                                            style={[styles.replyButton, { alignSelf: 'flex-start', marginTop: 8 }]}
                                                            onPress={() => hideNotification(item.id)}
                                                        >
                                                            <Text style={styles.replyButtonText}>Mark as Read</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                )}

                                {historyNotifications.length > 5 && (
                                    <TouchableOpacity
                                        style={styles.showMoreButton}
                                        onPress={() => setShowAllHistory(prev => !prev)}
                                    >
                                        <Text style={styles.showMoreText}>
                                            {showAllHistory
                                                ? 'Show Less'
                                                : `Show More (${historyNotifications.length - 5} more)`}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </ScrollView>

                <OverdueNotificationModal
                    visible={modalVisible}
                    onClose={handleCloseModal}
                    onSubmit={modalConfig.onSubmit}
                    assetName={modalConfig.assetName}
                    title={modalConfig.title}
                    requireProofImages={modalConfig.requireProofImages}
                    minProofImages={4}
                />
            </SafeAreaView>
            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                kind={snackbar.kind}
                onClose={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
                bottom={isMobileLayout ? 16 : 20}
            />
        </ImageBackground>
    );
};

export default OperatorDashboard;
