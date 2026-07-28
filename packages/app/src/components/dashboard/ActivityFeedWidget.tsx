import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';

export interface ActivityItem {
  id: string | number;
  title: string;
  subtitle?: string;
  time?: string;
  type?: 'assignment' | 'return' | 'alert' | 'general';
  rawItem?: any;
}

interface ActivityFeedWidgetProps {
  activities?: ActivityItem[];
  onConfirmReturn?: (item: any) => void;
  onWorkflowAction?: (item: any, action: 'approve' | 'reject') => void;
  onHideNotification?: (id: number) => void;
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

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
  activities = [],
  onConfirmReturn,
  onWorkflowAction,
  onHideNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVALS' | 'RETURNS' | 'ASSIGNMENTS'>('ALL');

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

  const filteredActivities = activities.filter((item) => {
    const raw = item.rawItem;
    const { eventType } = parseNotificationPayload(raw, item.title, item.subtitle);
    if (activeTab === 'APPROVALS') return eventType === 'approval';
    if (activeTab === 'RETURNS') return eventType === 'return';
    if (activeTab === 'ASSIGNMENTS') return eventType === 'assigned';
    return true;
  });

  return (
    <GlassCard title="Global Activity Feed" style={styles.card}>
      {/* Category Tabs for Simple User Grouping */}
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

      {filteredActivities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.radarContainer}>
            <Ionicons name="scan-outline" size={28} color="#38BDF8" />
          </View>
          <Text style={styles.emptyText}>No notifications found for this filter.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {filteredActivities.slice(0, 10).map((item, idx) => {
            const raw = item.rawItem;
            const { senderName, receiverName, displayMessage, eventType } = parseNotificationPayload(
              raw,
              item.title,
              item.subtitle,
            );

            const canConfirmReturn = raw && isReturnPending(raw) && onConfirmReturn;
            const canWorkflowAction = raw && isWorkflowApprovalPending(raw) && onWorkflowAction;

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

            return (
              <View key={item.id || idx} style={styles.activityItem}>
                <View style={styles.timelinePoint}>
                  <View style={[styles.dot, { backgroundColor: badgeColor }]} />
                  {idx < filteredActivities.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.itemContent}>
                  {/* FROM / TO USER HEADER */}
                  <View style={styles.headerMeta}>
                    <Text style={styles.fromUserText}>
                      From: <Text style={styles.userNameHighlight}>{senderName}</Text>
                      {receiverName ? (
                        <Text style={styles.toUserText}> ➔ To: <Text style={styles.userNameHighlight}>{receiverName}</Text></Text>
                      ) : null}
                    </Text>

                    <View style={[styles.typeBadge, { borderColor: badgeColor }]}>
                      <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                    </View>
                  </View>

                  {/* SIMPLE CLEAN MESSAGE */}
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

                    {onHideNotification && raw?.id && (
                      <TouchableOpacity
                        style={[styles.btn, styles.btnMuted]}
                        onPress={() => onHideNotification(Number(raw.id))}
                      >
                        <Text style={styles.btnMutedText}>Dismiss</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {item.time && <Text style={styles.itemTime}>{item.time}</Text>}
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  radarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    gap: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelinePoint: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22D3EE',
    marginTop: 4,
  },
  line: {
    width: 2,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  typeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemMessage: {
    color: '#E2E8F0',
    fontSize: 12.5,
    lineHeight: 18,
  },
  itemTime: {
    color: '#64748B',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
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
});
