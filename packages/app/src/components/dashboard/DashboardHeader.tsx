import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityItem } from './ActivityFeedWidget';
import { NotificationDrawer } from './NotificationDrawer';

interface DashboardHeaderProps {
  companyName?: string;
  userName?: string;
  userRole?: string;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  activities?: ActivityItem[];
  onConfirmReturn?: (item: any) => void;
  onWorkflowAction?: (item: any, action: 'approve' | 'reject') => void;
  onHideNotification?: (id: number) => void;
  onExtendDate?: (notificationId: number, days: number) => void;
  onReplyNotification?: (item: any, replyMessage: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  companyName = 'ASQ - NSCLLP',
  userName = 'User',
  userRole = 'Asset Management',
  onSearch,
  onLogout,
  activities = [],
  onConfirmReturn,
  onWorkflowAction,
  onHideNotification,
  onExtendDate,
  onReplyNotification,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unreadCount = activities.length;

  return (
    <View style={styles.headerContainer}>
      {/* Brand / Logo */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/asq_icon_with_text_v3.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.brandTextContainer}>
          <Text style={styles.companyName} numberOfLines={1}>{companyName}</Text>
          <Text style={styles.roleName}>{userRole}</Text>
        </View>
      </View>

      {/* Universal Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Universal Search"
          placeholderTextColor="#64748B"
          onChangeText={onSearch}
        />
      </View>

      {/* User Chip, Highlighted Notification Bell & Logout */}
      <View style={styles.userContainer}>
        {/* Highlighted Notification Bell Button */}
        <TouchableOpacity
          style={[styles.bellButton, unreadCount > 0 && styles.bellButtonActive]}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={unreadCount > 0 ? "notifications" : "notifications-outline"}
            size={20}
            color={unreadCount > 0 ? "#38BDF8" : "#E2E8F0"}
          />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User Profile Chip */}
        <View style={styles.userChip}>
          <Ionicons name="person-circle-outline" size={20} color="#38BDF8" />
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
        </View>

        {/* Logout Button */}
        {onLogout && (
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Right Side Notification Slider Drawer */}
      <NotificationDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activities={activities}
        onConfirmReturn={onConfirmReturn}
        onWorkflowAction={onWorkflowAction}
        onHideNotification={onHideNotification}
        onExtendDate={onExtendDate}
        onReplyNotification={onReplyNotification}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#22D3EE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoText: {
    color: '#22D3EE',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  logoSubtext: {
    color: '#94A3B8',
    fontSize: 7,
    fontWeight: '700',
    marginTop: -2,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  companyName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  roleName: {
    color: '#94A3B8',
    fontSize: 11,
  },
  searchContainer: {
    flex: 1,
    minWidth: 200,
    maxWidth: 420,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 0,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
