import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityItem } from './ActivityFeedWidget';

interface NotificationDrawerProps {
  visible: boolean;
  onClose: () => void;
  activities?: ActivityItem[];
  onConfirmReturn?: (item: any) => void;
  onWorkflowAction?: (item: any, action: 'approve' | 'reject') => void;
  onHideNotification?: (id: number) => void;
  onExtendDate?: (notificationId: number, days: number) => void;
  onReplyNotification?: (item: any, replyMessage: string) => void;
}

const parseNotificationPayload = (raw: any, defaultTitle: string, defaultSubtitle?: string) => {
  let senderName = raw?.sender?.name || raw?.senderName || raw?.operatorName || 'System';
  let receiverName = raw?.receiver?.name || raw?.receiverName || '';
  let displayMessage = defaultSubtitle || defaultTitle;
  let eventType: 'assigned' | 'return' | 'approval' | 'general' = 'general';

  if (raw?.reply) {
    try {
      const parsed = JSON.parse(raw.reply);
      if (typeof parsed === 'object' && parsed !== null) {
        if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          displayMessage = parsed.message;
        } else if (typeof parsed.reason === 'string' && parsed.reason.trim().length > 0) {
          displayMessage = parsed.reason;
        } else if (typeof parsed.notes === 'string' && parsed.notes.trim().length > 0) {
          displayMessage = parsed.notes;
        }

        if (parsed.senderName) senderName = parsed.senderName;
        if (parsed.operatorName) senderName = parsed.operatorName;
      } else if (typeof parsed === 'string') {
        displayMessage = parsed;
      }
    } catch {
      displayMessage = raw.reply;
    }
  } else if (raw?.reason) {
    displayMessage = raw.reason;
  }

  const msgLower = (displayMessage + ' ' + (raw?.reason || '')).toLowerCase();
  if (msgLower.includes('returned') || msgLower.includes('return')) {
    eventType = 'return';
  } else if (msgLower.includes('assigned') || msgLower.includes('assignment')) {
    eventType = 'assigned';
  } else if (msgLower.includes('approval') || msgLower.includes('workflow')) {
    eventType = 'approval';
  }

  return { senderName, receiverName, displayMessage, eventType };
};

const extractExtensionDays = (msg: string): number => {
  const text = (msg || '').toLowerCase();
  if (text.includes('1 month') || text.includes('30 days') || text.includes('30 day')) return 30;
  if (text.includes('15 days') || text.includes('15 day')) return 15;
  if (text.includes('10 days') || text.includes('10 day')) return 10;
  if (text.includes('7 days') || text.includes('7 day')) return 7;
  if (text.includes('5 days') || text.includes('5 day')) return 5;
  if (text.includes('3 days') || text.includes('3 day')) return 3;

  const match = text.match(/(\d+)\s*day/);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 7;
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  visible,
  onClose,
  activities = [],
  onConfirmReturn,
  onWorkflowAction,
  onHideNotification,
  onExtendDate,
  onReplyNotification,
}) => {
  const { width, height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVALS' | 'RETURNS' | 'ASSIGNMENTS'>('ALL');
  const [replyingNotifId, setReplyingNotifId] = useState<string | number | null>(null);
  const [extendReason, setExtendReason] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number>(5);

  if (!visible) return null;

  const drawerWidth = Math.min(width * 0.85, 420);

  const isReturnPending = (raw: any) => {
    if (!raw) return false;
    const reasonText = String(raw.reason || '').toLowerCase();
    const replyText = String(raw.reply || '').toLowerCase();
    const statusText = String(raw.status || '').toLowerCase();
    const isPendingStatus = statusText === 'unread' || statusText === 'replied';
    const isPendingText = reasonText.includes('has been returned by') || replyText.includes('pending confirmation');
    return isPendingStatus && isPendingText;
  };

  const isWorkflowApprovalPending = (raw: any) => {
    if (!raw || !raw.reply) return false;
    try {
      const parsed = JSON.parse(raw.reply);
      return parsed.kind === 'workflow_approval_pending' && ['unread', 'replied'].includes(raw.status);
    } catch {
      return false;
    }
  };

  const isExtensionEligible = (raw: any, msg: string) => {
    if (!raw) return false;
    const text = (msg + ' ' + (raw?.reason || '')).toLowerCase();
    const isStatusEligible = ['unread', 'replied', 'received'].includes(String(raw.status || '').toLowerCase());
    return isStatusEligible && (text.includes('extend') || text.includes('project requires') || text.includes('days') || text.includes('due date') || text.includes('overdue'));
  };

  const filteredActivities = activities.filter((item) => {
    const raw = item.rawItem;
    const { eventType } = parseNotificationPayload(raw, item.title, item.subtitle);
    if (activeTab === 'APPROVALS') return eventType === 'approval';
    if (activeTab === 'RETURNS') return eventType === 'return';
    if (activeTab === 'ASSIGNMENTS') return eventType === 'assigned';
    return true;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Semi-transparent backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Right Side Drawer Panel */}
        <View style={[styles.drawerPanel, { width: drawerWidth, height }]}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellIconWrap}>
                <Ionicons name="notifications" size={18} color="#22D3EE" />
              </View>
              <Text style={styles.drawerTitle}>Notifications & Activity</Text>
              {activities.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activities.length}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close-outline" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Filter Category Tabs */}
          <View style={styles.tabRow}>
            {(['ALL', 'APPROVALS', 'RETURNS', 'ASSIGNMENTS'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity List Content */}
          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredActivities.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.radarContainer}>
                  <Ionicons name="notifications-off-outline" size={32} color="#38BDF8" />
                </View>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySub}>You're all caught up with your activity feed.</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredActivities.map((item, idx) => {
                  const raw = item.rawItem;
                  const { senderName, receiverName, displayMessage, eventType } = parseNotificationPayload(
                    raw,
                    item.title,
                    item.subtitle,
                  );

                  const canConfirmReturn = raw && isReturnPending(raw) && onConfirmReturn;
                  const canWorkflowAction = raw && isWorkflowApprovalPending(raw) && onWorkflowAction;
                  const canExtend = raw && isExtensionEligible(raw, displayMessage) && onExtendDate;
                  const isOverdueAlert = raw && 
                    (String(raw.reason || '').toLowerCase().includes('overdue') || 
                     String(item.title || '').toLowerCase().includes('overdue')) &&
                    ['unread', 'pending', 'received'].includes(String(raw.status || '').toLowerCase());

                  const badgeColor =
                    eventType === 'approval'
                      ? '#EAB308'
                      : eventType === 'return'
                        ? '#EF4444'
                        : eventType === 'assigned'
                          ? '#3B82F6'
                          : '#22D3EE';

                  const badgeLabel =
                    eventType === 'approval'
                      ? 'APPROVAL'
                      : eventType === 'return'
                        ? 'RETURN'
                        : eventType === 'assigned'
                          ? 'ASSIGNED'
                          : 'INFO';

                  const notifId = raw?.id || raw?.notificationId;

                  return (
                    <View key={item.id || idx} style={styles.activityCard}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.typeBadge, { borderColor: badgeColor, backgroundColor: `${badgeColor}15` }]}>
                          <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                        </View>
                        {item.time && <Text style={styles.itemTime}>{item.time}</Text>}
                      </View>

                      {/* FROM / TO META */}
                      <Text style={styles.fromUserText}>
                        From: <Text style={styles.userNameHighlight}>{senderName}</Text>
                        {receiverName ? (
                          <Text style={styles.toUserText}> ➔ To: <Text style={styles.userNameHighlight}>{receiverName}</Text></Text>
                        ) : null}
                      </Text>

                      {/* MESSAGE */}
                      <Text style={styles.itemMessage}>“{displayMessage}”</Text>

                      {/* ACTION BUTTONS */}
                      <View style={styles.actionRow}>
                        {canConfirmReturn && (
                          <TouchableOpacity
                            style={[styles.btn, styles.btnSuccess]}
                            onPress={() => onConfirmReturn(raw)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={14} color="#FFF" />
                            <Text style={styles.btnText}>Confirm Return</Text>
                          </TouchableOpacity>
                        )}

                        {canWorkflowAction && (
                          <>
                            <TouchableOpacity
                              style={[styles.btn, styles.btnSuccess]}
                              onPress={() => onWorkflowAction(raw, 'approve')}
                            >
                              <Ionicons name="checkmark-outline" size={14} color="#FFF" />
                              <Text style={styles.btnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.btn, styles.btnDanger]}
                              onPress={() => onWorkflowAction(raw, 'reject')}
                            >
                              <Ionicons name="close-outline" size={14} color="#FFF" />
                              <Text style={styles.btnText}>Reject</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {canExtend && notifId && (() => {
                          const extDays = extractExtensionDays(displayMessage);
                          const label = extDays === 30 ? '1 Month' : `${extDays} Days`;
                          return (
                            <TouchableOpacity
                              style={[styles.btn, styles.btnPrimary]}
                              onPress={() => onExtendDate(Number(notifId), extDays)}
                            >
                              <Ionicons name="calendar-outline" size={14} color="#FFF" />
                              <Text style={styles.btnText}>Approve {label} Extension</Text>
                            </TouchableOpacity>
                          );
                        })()}

                        {onHideNotification && notifId && (
                          <TouchableOpacity
                            style={[styles.btn, styles.btnMuted]}
                            onPress={() => onHideNotification(Number(notifId))}
                          >
                            <Text style={styles.btnMutedText}>Dismiss</Text>
                          </TouchableOpacity>
                        )}

                        {isOverdueAlert && onReplyNotification && notifId && replyingNotifId !== notifId && (
                          <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={() => setReplyingNotifId(notifId)}
                          >
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFF" />
                            <Text style={styles.btnText}>Reply</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {isOverdueAlert && onReplyNotification && notifId && replyingNotifId === notifId && (
                        <View style={styles.replySectionContainer}>
                          {/* Reason Input */}
                          <Text style={styles.replyLabel}>Reason to extend days:</Text>
                          <TextInput
                            style={styles.replyInput}
                            placeholder="Type reason here (e.g. Project deadline extended)..."
                            placeholderTextColor="#64748B"
                            value={extendReason}
                            onChangeText={setExtendReason}
                            multiline
                            numberOfLines={2}
                          />

                          {/* Days Selection Chips */}
                          <Text style={[styles.replyLabel, { marginTop: 10 }]}>Extension duration:</Text>
                          <View style={styles.daysChipRow}>
                            {[3, 5, 7, 10, 15, 30].map((days) => {
                              const isActive = selectedDays === days;
                              return (
                                <TouchableOpacity
                                  key={days}
                                  style={[styles.daysChip, isActive && styles.daysChipActive]}
                                  onPress={() => setSelectedDays(days)}
                                >
                                  <Text style={[styles.daysChipText, isActive && styles.daysChipTextActive]}>
                                    {days} Days
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Action Buttons (Submit & Cancel) */}
                          <View style={styles.replyActionRow}>
                            <TouchableOpacity
                              style={styles.btnCancelReply}
                              onPress={() => {
                                setReplyingNotifId(null);
                                setExtendReason('');
                              }}
                            >
                              <Text style={styles.btnCancelReplyText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btn, styles.btnSuccess]}
                              onPress={() => {
                                const baseMsg = extendReason.trim() || 'I need the asset for extra days, please extend';
                                const msg = `${baseMsg} (${selectedDays} Days)`;
                                onReplyNotification(raw, msg);
                                setReplyingNotifId(null);
                                setExtendReason('');
                              }}
                            >
                              <Ionicons name="send-outline" size={12} color="#FFF" />
                              <Text style={styles.btnText}>Send Request</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  drawerPanel: {
    backgroundColor: '#0F172A',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(56, 189, 248, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: -5, height: 0 },
    elevation: 25,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  countBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
  },
  tabChip: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabChipActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderColor: '#22D3EE',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#22D3EE',
    fontWeight: '700',
  },
  drawerScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  radarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  listContainer: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  itemTime: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  fromUserText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  toUserText: {
    color: '#64748B',
    fontSize: 12,
  },
  userNameHighlight: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  itemMessage: {
    color: '#E2E8F0',
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  btnPrimary: {
    backgroundColor: '#0284C7',
  },
  btnSuccess: {
    backgroundColor: '#16A34A',
  },
  btnDanger: {
    backgroundColor: '#DC2626',
  },
  btnMuted: {
    backgroundColor: '#334155',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  btnMutedText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  replySectionContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  replyLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  daysChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  daysChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 40,
    alignItems: 'center',
  },
  daysChipText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  daysChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  daysChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  replyInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 6,
    color: '#F8FAFC',
    fontSize: 12,
    padding: 8,
    textAlignVertical: 'top',
    marginBottom: 8,
    minHeight: 48,
  },
  replyActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  btnCancelReply: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  btnCancelReplyText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
});
