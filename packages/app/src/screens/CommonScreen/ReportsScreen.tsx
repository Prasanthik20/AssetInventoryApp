import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { baseURL, RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

type ReportRow = {
  assignmentId: number;
  assetId: number;
  assetName: string;
  serialNo: string | null;
  operatorEmployeeId: number;
  operatorName: string;
  supervisorEmployeeId: number;
  supervisorName: string;
  location: string | null;
  projectName: string | null;
  notes: string | null;
  assignedDate: string | null;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  status: string;
};

type Summary = {
  totalAssignments: number;
  activeAssignments: number;
  returnedAssignments: number;
  overdueAssignments: number;
  pendingApprovalConfirmations?: number;
  totalAssets?: number;
  officeAssets?: number;
  underMaintenanceAssets?: number;
};

type ReceiptProofPayload = {
  kind?: string;
  message?: string;
  proofCount?: number;
  proofPhotos?: string[];
};

type StatusFilter = 'all' | 'active' | 'returned' | 'overdue';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

const csvEscape = (value: string | number | null | undefined) => {
  const raw = String(value ?? '');
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const normalizeStatus = (status: string) => String(status || '').trim().toLowerCase();

const statusBadgeColor = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'overdue') return '#F97316';
  if (normalized === 'returned') return '#22C55E';
  if (normalized === 'active') return '#38BDF8';
  return '#A5B4FC';
};

const statusBadgeBackground = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'overdue') return 'rgba(249, 115, 22, 0.16)';
  if (normalized === 'returned') return 'rgba(16, 185, 129, 0.16)';
  if (normalized === 'active') return 'rgba(14, 165, 233, 0.16)';
  return 'rgba(129, 140, 248, 0.16)';
};

const parseReceiptProofNote = (value?: string | null) => {
  const raw = String(value || '').trim();
  const marker = '[RECEIPT_PROOF]';

  if (!raw || !raw.includes(marker)) {
    return {
      isReceiptProof: false,
      message: raw,
      photos: [] as string[],
      proofCount: 0,
    };
  }

  const payloadText = raw.slice(raw.indexOf(marker) + marker.length).trim();
  const startIndex = payloadText.indexOf('{');
  const endIndex = payloadText.lastIndexOf('}');
  const jsonText =
    startIndex >= 0 && endIndex > startIndex
      ? payloadText.slice(startIndex, endIndex + 1)
      : payloadText;

  try {
    const parsed = JSON.parse(jsonText) as ReceiptProofPayload;
    const photos = Array.isArray(parsed?.proofPhotos)
      ? parsed.proofPhotos.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    return {
      isReceiptProof: true,
      message: String(parsed?.message || 'Asset receipt confirmation').trim(),
      photos,
      proofCount: Number(parsed?.proofCount) || photos.length,
    };
  } catch {
    return {
      isReceiptProof: true,
      message: 'Asset receipt confirmation',
      photos: [] as string[],
      proofCount: 0,
    };
  }
};

const getInitials = (name?: string | null) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createReportHtml = (title: string, rows: ReportRow[], summary: Summary) => {
  const rowsHtml = rows
    .map((item) => {
      return `
      <tr>
        <td>${escapeHtml(item.assetName || '-')}</td>
        <td>${escapeHtml(item.serialNo || 'N/A')}</td>
        <td>${escapeHtml(item.operatorName || '-')}</td>
        <td>${escapeHtml(item.supervisorName || '-')}</td>
        <td>${escapeHtml(formatDate(item.assignedDate))}</td>
        <td>${escapeHtml(formatDate(item.expectedReturnDate))}</td>
        <td>${escapeHtml(formatDate(item.returnedDate))}</td>
        <td>${escapeHtml(item.status || '-')}</td>
      </tr>`;
    })
    .join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
        h1 { margin: 0 0 8px; font-size: 20px; }
        .meta { margin-bottom: 16px; color: #475569; font-size: 12px; }
        .summary { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
        .k { font-size: 11px; color: #334155; }
        .v { font-size: 18px; font-weight: 700; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #e2e8f0; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
      <div class="">
        <div class="card"><div class="k">Total Allocated</div><div class="v">${summary.totalAssignments}</div></div>
        <div class="card"><div class="k">Active</div><div class="v">${summary.activeAssignments}</div></div>
        <div class="card"><div class="k">Return</div><div class="v">${summary.returnedAssignments}</div></div>
        <div class="card"><div class="k">Overdue</div><div class="v">${summary.overdueAssignments}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Serial</th>
            <th>Assigned To</th>
            <th>Assigned By</th>
            <th>Assigned Date</th>
            <th>Expected Return</th>
            <th>Returned Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
  </html>`;
};

const ReportsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { employeeId, roleName } = route.params;
  const { width, height } = useWindowDimensions();
  const isCompactLayout = width < 768;
  const isNarrowMobile = width < 430;
  const isWebDesktop = Platform.OS === 'web' && width >= 1024;
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({
    totalAssignments: 0,
    activeAssignments: 0,
    returnedAssignments: 0,
    overdueAssignments: 0,
  });
  const [history, setHistory] = useState<ReportRow[]>([]);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<{
    assetName: string;
    message: string;
    photos: string[];
  } | null>(null);

  const openProofModal = (assetName: string, message: string, photos: string[]) => {
    setSelectedProof({ assetName, message, photos });
    setProofModalVisible(true);
  };

  const closeProofModal = () => {
    setProofModalVisible(false);
    setSelectedProof(null);
  };

  const openDetailModal = (row: ReportRow) => {
    setSelectedRow(row);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setSelectedRow(null);
    setDetailModalVisible(false);
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/reports/asset-history`, {
        params: { employeeId, roleName },
      });

      setSummary(response.data.summary || {
        totalAssignments: 0,
        activeAssignments: 0,
        returnedAssignments: 0,
        overdueAssignments: 0,
      });
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Reports fetch error:', error);
      setSummary({
        totalAssignments: 0,
        activeAssignments: 0,
        returnedAssignments: 0,
        overdueAssignments: 0,
      });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, roleName]);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports]),
  );

  const title = useMemo(() => {
    const normalized = String(roleName || '').toLowerCase();
    if (normalized.includes('admin')) return 'Admin Reports';
    if (normalized.includes('supervisor')) return 'Supervisor Reports';
    return 'Reports';
  }, [roleName]);

  const isAdminRole = useMemo(() => String(roleName || '').toLowerCase().includes('admin'), [roleName]);

  const summaryCards = useMemo(() => {
    if (isAdminRole) {
      return [
        { label: 'Total Assets', value: summary.totalAssets ?? 0 },
        { label: 'Total Allocated', value: summary.totalAssignments ?? 0 },
        { label: 'In Office', value: summary.officeAssets ?? 0 },
        { label: 'Overdue', value: summary.overdueAssignments ?? 0 },
        { label: 'Maintenance', value: summary.underMaintenanceAssets ?? 0 },
        {
          label: 'Pending Approval Confirmation',
          value: summary.pendingApprovalConfirmations ?? 0,
        },
      ];
    }

    return [
      { label: 'Total Allocated', value: summary.totalAssignments ?? 0 },
      { label: 'Overdue', value: summary.overdueAssignments ?? 0 },
      { label: 'Returned', value: summary.returnedAssignments ?? 0 },
      {
        label: 'Pending Approval Confirmation',
        value: summary.pendingApprovalConfirmations ?? 0,
      },
    ];
  }, [isAdminRole, summary]);

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const normalized = String(roleName || '').toLowerCase();
    if (normalized.includes('admin')) {
      navigation.navigate('CompanyDashboard', {
        adminName: 'Admin',
        adminImage: null,
        roleName,
        employeeId,
      });
      return;
    }

    if (normalized.includes('supervisor')) {
      navigation.navigate('SupervisorDashboard', {
        supervisorName: 'Supervisor',
        roleName,
        employeeId,
      });
      return;
    }

    navigation.navigate('CompanyLogin');
  }, [navigation, roleName, employeeId]);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return history.filter((item) => {
      const itemStatus = normalizeStatus(item.status);
      const statusMatch = statusFilter === 'all' ? true : itemStatus === statusFilter;

      const haystack = [
        item.assetName,
        item.serialNo,
        item.operatorName,
        String(item.operatorEmployeeId),
        item.supervisorName,
        String(item.supervisorEmployeeId),
        item.projectName,
        item.location,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const queryMatch = normalizedQuery ? haystack.includes(normalizedQuery) : true;

      return statusMatch && queryMatch;
    });
  }, [history, searchQuery, statusFilter]);

  const exportAsExcel = useCallback(async () => {
    if (!filteredHistory.length) {
      Alert.alert('No Data', 'There is no report data to export.');
      return;
    }

    const header = [
      'Assignment ID',
      'Asset ID',
      'Asset Name',
      'Serial No',
      'Assigned To',
      'Assigned To Employee ID',
      'Assigned By',
      'Assigned By Employee ID',
      'Assigned Date',
      'Expected Return Date',
      'Returned Date',
      'Project',
      'Location',
      'Status',
      'Notes',
    ];

    const body = filteredHistory.map((item) => [
      item.assignmentId,
      item.assetId,
      item.assetName,
      item.serialNo || '',
      item.operatorName,
      item.operatorEmployeeId,
      item.supervisorName,
      item.supervisorEmployeeId,
      formatDate(item.assignedDate),
      formatDate(item.expectedReturnDate),
      formatDate(item.returnedDate),
      item.projectName || '',
      item.location || '',
      item.status,
      item.notes || '',
    ]);

    const csvContent = [header, ...body].map((row) => row.map(csvEscape).join(',')).join('\n');
    const filename = `asset-report-${Date.now()}.csv`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');

        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Report as Excel (CSV)',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Export Saved', `CSV saved at: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Excel export error:', error);
      Alert.alert('Export Failed', 'Unable to export CSV.');
    }
  }, [filteredHistory]);

  const exportAsPdf = useCallback(async () => {
    if (!filteredHistory.length) {
      Alert.alert('No Data', 'There is no report data to export.');
      return;
    }

    try {
      const html = createReportHtml(title, filteredHistory, summary);

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
        if (!printWindow) {
          Alert.alert('Export Failed', 'Unable to open print window. Please allow popups.');
          return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } else {
        const Print = require('expo-print');
        const Sharing = require('expo-sharing');

        const result = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();

        if (canShare) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Report as PDF',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Export Saved', `PDF saved at: ${result.uri}`);
        }
      }
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Failed', 'Unable to export PDF.');
    }
  }, [filteredHistory, summary, title]);

  const selectedReceiptProof = useMemo(() => {
    return selectedRow ? parseReceiptProofNote(selectedRow.notes) : null;
  }, [selectedRow]);

  return (
    <ImageBackground
      style={styles.background}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} hitSlop={8} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#E6F3FF" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={fetchReports}>
            <Ionicons name="refresh" size={22} color="#22D3EE" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#22D3EE" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.dashboardShell, isWebDesktop ? styles.dashboardShellWide : null]}>
              <View style={styles.summaryGrid}>
                {summaryCards.map((card) => (
                  <SummaryCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    compact={isCompactLayout}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Assigned Asset History</Text>

              <View style={[styles.filterBar, isCompactLayout ? styles.filterBarMobile : null]}>
                <View style={[styles.filterLeftPane, isCompactLayout ? styles.filterLeftPaneMobile : null]}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search" size={16} color="#8DA8C5" />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={
                        isNarrowMobile
                          ? 'Search assets or employee'
                          : 'Search asset, serial, assigned employee, supervisor, or status'
                      }
                      placeholderTextColor="#6D86A3"
                      style={styles.searchInput}
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
                    {(['all', 'active', 'returned', 'overdue'] as StatusFilter[]).map((status) => {
                      const selected = statusFilter === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusTab, selected ? styles.statusTabActive : null]}
                          onPress={() => setStatusFilter(status)}
                        >
                          <Text style={[styles.statusTabText, selected ? styles.statusTabTextActive : null]}>
                            {status.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={[styles.toolbarActions, isCompactLayout ? styles.toolbarActionsMobile : null]}>
                  <TouchableOpacity
                    style={[styles.exportButton, isCompactLayout ? styles.exportButtonMobile : null]}
                    onPress={exportAsExcel}
                  >
                    <Ionicons name="download-outline" size={14} color="#CFEAFF" />
                    <Text style={styles.exportButtonText}>Export Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.exportButton,
                      styles.pdfButton,
                      isCompactLayout ? styles.exportButtonMobile : null,
                    ]}
                    onPress={exportAsPdf}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#DDE8FF" />
                    <Text style={styles.exportButtonText}>Export PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>

            {filteredHistory.length === 0 ? (
              <Text style={styles.emptyText}>No history found for current filter.</Text>
            ) : isCompactLayout ? (
              <View style={styles.mobileListContainer}>
                {filteredHistory.map((item) => (
                  <View key={item.assignmentId} style={styles.mobileListCard}>
                    <View style={styles.mobileListHeaderRow}>
                      <Text style={styles.mobileAssetName} numberOfLines={1}>{item.assetName}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            borderColor: statusBadgeColor(item.status),
                            backgroundColor: statusBadgeBackground(item.status),
                          },
                        ]}
                      >
                        <Text style={[styles.statusPillText, { color: statusBadgeColor(item.status) }]}> 
                          {String(item.status || '-').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.mobileListMeta}>Serial: {item.serialNo || 'N/A'}</Text>
                    <Text style={styles.mobileListMeta}>Assigned To: {item.operatorName} ({item.operatorEmployeeId})</Text>
                    <Text style={styles.mobileListMeta}>Assigned By: {item.supervisorName} ({item.supervisorEmployeeId})</Text>
                    <Text style={styles.mobileListMeta}>Assigned: {formatDate(item.assignedDate)}</Text>
                    <Text style={styles.mobileListMeta}>Expected Return: {formatDate(item.expectedReturnDate)}</Text>
                    <Text style={styles.mobileListMeta}>Returned: {formatDate(item.returnedDate)}</Text>

                    <TouchableOpacity style={[styles.viewButton, styles.mobileViewButton]} onPress={() => openDetailModal(item)}>
                      <Text style={styles.viewButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.tableContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.tableInner}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, styles.colAsset]}>Asset</Text>
                      <Text style={[styles.tableHeaderCell, styles.colSerial]}>Serial</Text>
                      <Text style={[styles.tableHeaderCell, styles.colAssignedTo]}>Assigned To</Text>
                      <Text style={[styles.tableHeaderCell, styles.colAssignedBy]}>Assigned By</Text>
                      <Text style={[styles.tableHeaderCell, styles.colDate]}>Assigned</Text>
                      <Text style={[styles.tableHeaderCell, styles.colDate]}>Expected Return</Text>
                      <Text style={[styles.tableHeaderCell, styles.colDate]}>Returned</Text>
                      <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                      <Text style={[styles.tableHeaderCell, styles.colAction]}>Actions</Text>
                    </View>
                    <ScrollView style={styles.tableBodyScroll} nestedScrollEnabled>
                      {filteredHistory.map((item, index) => (
                        <View key={item.assignmentId} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : null]}>
                          <Text style={[styles.tableCell, styles.colAsset]} numberOfLines={2}>{item.assetName}</Text>
                          <Text style={[styles.tableCell, styles.colSerial]} numberOfLines={1}>{item.serialNo || 'N/A'}</Text>
                          <Text style={[styles.tableCell, styles.colAssignedTo]} numberOfLines={2}>
                            {item.operatorName} ({item.operatorEmployeeId})
                          </Text>
                          <Text style={[styles.tableCell, styles.colAssignedBy]} numberOfLines={2}>
                            {item.supervisorName} ({item.supervisorEmployeeId})
                          </Text>
                          <Text style={[styles.tableCell, styles.colDate]}>{formatDate(item.assignedDate)}</Text>
                          <Text style={[styles.tableCell, styles.colDate]}>{formatDate(item.expectedReturnDate)}</Text>
                          <Text style={[styles.tableCell, styles.colDate]}>{formatDate(item.returnedDate)}</Text>
                          <View style={[styles.colStatus, styles.statusPillWrap]}>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  borderColor: statusBadgeColor(item.status),
                                  backgroundColor: statusBadgeBackground(item.status),
                                },
                              ]}
                            >
                              <Text style={[styles.statusPillText, { color: statusBadgeColor(item.status) }]}> 
                                {String(item.status || '-').toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.tableCell, styles.colAction, styles.actionCell]}>
                            <TouchableOpacity style={styles.viewButton} onPress={() => openDetailModal(item)}>
                              <Text style={styles.viewButtonText}>View</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              </View>
            )}

            </View>
          </ScrollView>
        )}

        <Modal
          visible={detailModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={closeDetailModal}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                isCompactLayout
                  ? {
                      width: '100%',
                      maxHeight: Math.max(420, height * 0.88),
                      borderRadius: 12,
                    }
                  : {
                      width: Math.min(980, Math.max(760, width * 0.85)),
                      maxHeight: Math.max(540, height * 0.88),
                      borderRadius: 14,
                    },
              ]}
            >
              <TouchableOpacity style={styles.detailModalCloseIcon} onPress={closeDetailModal}>
                <Ionicons name="close" size={20} color="#D6E3F3" />
              </TouchableOpacity>

              <ScrollView contentContainerStyle={styles.detailModalBody}>
                <View style={styles.detailHeroRow}>
                  <View style={styles.detailHeroIconWrap}>
                    <Ionicons name="car-sport-outline" size={22} color="#8FD3FF" />
                  </View>
                  <View style={styles.detailHeroAvatar}>
                    <Text style={styles.detailHeroAvatarText}>{getInitials(selectedRow?.operatorName)}</Text>
                  </View>
                </View>

                <Text style={styles.detailModalTitle}>Asset Assignment Details</Text>
                <Text style={styles.detailModalSubtitle}>
                  {selectedRow?.assetName || '-'} | {selectedRow?.serialNo || 'N/A'}
                </Text>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridColumn}>
                    <InfoBlock label="Assignment ID" value={String(selectedRow?.assignmentId || '-')} />
                    <InfoBlock label="Asset ID" value={String(selectedRow?.assetId || '-')} />
                    <InfoBlock label="Serial Number" value={selectedRow?.serialNo || 'N/A'} />
                    <InfoBlock label="Project" value={selectedRow?.projectName || 'N/A'} />
                  </View>

                  <View style={styles.detailGridColumn}>
                    <PersonBlock
                      label="Assigned To"
                      name={selectedRow?.operatorName || '-'}
                      extra={`(${selectedRow?.operatorEmployeeId || '-'})`}
                    />
                    <PersonBlock
                      label="Assigned By"
                      name={selectedRow?.supervisorName || '-'}
                      extra={`(${selectedRow?.supervisorEmployeeId || '-'})`}
                    />
                    <InfoBlock label="Location" value={selectedRow?.location || 'N/A'} />
                  </View>
                </View>

                <View style={styles.detailDateRow}>
                  <DateInfoBlock label="Assigned Date" value={formatDate(selectedRow?.assignedDate)} />
                  <DateInfoBlock label="Expected Return Date" value={formatDate(selectedRow?.expectedReturnDate)} />
                  <DateInfoBlock label="Returned Date" value={formatDate(selectedRow?.returnedDate)} />
                  <View style={styles.dateInfoBlock}>
                    <Text style={styles.dateInfoLabel}>Status</Text>
                    <View style={styles.detailStatusBadge}>
                      <Text style={styles.detailStatusText}>{String(selectedRow?.status || '-').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.notesStrip}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesValue}>{selectedRow?.notes || 'N/A'}</Text>
                </View>

                {selectedReceiptProof?.isReceiptProof ? (
                  <TouchableOpacity
                    style={styles.openProofButton}
                    onPress={() =>
                      openProofModal(
                        selectedRow?.assetName || '-',
                        selectedReceiptProof.message,
                        selectedReceiptProof.photos,
                      )
                    }
                  >
                    <Ionicons name="images-outline" size={16} color="#D6E3F3" />
                    <Text style={styles.openProofButtonText}>
                      View Proof Photos ({selectedReceiptProof.proofCount || selectedReceiptProof.photos.length || 0})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>

              <View style={styles.detailModalFooter}>
                <TouchableOpacity style={styles.footerGhostButton} onPress={closeDetailModal}>
                  <Text style={styles.footerGhostButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={proofModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={closeProofModal}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                isCompactLayout
                  ? {
                      width: '100%',
                      maxHeight: Math.max(420, height * 0.88),
                      borderRadius: 12,
                    }
                  : {
                      width: Math.min(980, Math.max(720, width * 0.84)),
                      maxHeight: Math.max(520, height * 0.86),
                      borderRadius: 14,
                    },
              ]}
            >
              <View style={styles.modalAccentRail} />
              <View style={styles.modalHandle} />
              <ModalHeader
                icon="images-outline"
                title="Asset Receipt Confirmation"
                subtitle={selectedProof?.assetName || '-'}
                onClose={closeProofModal}
              />
              <Text style={styles.modalMessage}>Message: {selectedProof?.message || 'Received'}</Text>

              <ScrollView
                showsVerticalScrollIndicator={!isCompactLayout}
                contentContainerStyle={styles.photoRow}
              >
                {(selectedProof?.photos || []).length === 0 ? (
                  <Text style={styles.emptyText}>No proof photos available.</Text>
                ) : (
                  <View style={styles.photoGrid}>
                    {(selectedProof?.photos || []).map((uri, index) => (
                      <Image
                        key={`receipt-proof-${index}`}
                        source={{ uri }}
                        style={[
                          styles.proofPhoto,
                          isCompactLayout
                            ? styles.proofPhotoMobile
                            : styles.proofPhotoDesktop,
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.modalCloseButton} onPress={closeProofModal}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
};

const SummaryCard = ({
  label,
  value,
  compact,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) => (
  <View style={[styles.summaryCard, compact ? styles.summaryCardMobile : null]}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const DetailLine = ({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) => (
  <View style={styles.detailLine}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, multiline ? styles.detailValueMultiline : null]} numberOfLines={multiline ? 5 : 2}>
      {value}
    </Text>
  </View>
);

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoBlock}>
    <Text style={styles.infoBlockLabel}>{label}</Text>
    <Text style={styles.infoBlockValue}>{value}</Text>
  </View>
);

const PersonBlock = ({
  label,
  name,
  extra,
}: {
  label: string;
  name: string;
  extra: string;
}) => (
  <View style={styles.infoBlock}>
    <Text style={styles.infoBlockLabel}>{label}</Text>
    <View style={styles.personRow}>
      <View style={styles.personAvatar}>
        <Text style={styles.personAvatarText}>{getInitials(name)}</Text>
      </View>
      <Text style={styles.infoBlockValue} numberOfLines={1}>{`${name} ${extra}`}</Text>
    </View>
  </View>
);

const DateInfoBlock = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.dateInfoBlock}>
    <Text style={styles.dateInfoLabel}>{label}</Text>
    <View style={styles.dateValueRow}>
      <Ionicons name="calendar-outline" size={14} color="#9AB6D6" />
      <Text style={styles.dateInfoValue}>{value}</Text>
    </View>
  </View>
);

const ModalHeader = ({
  title,
  subtitle,
  onClose,
  icon,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.modalHeader}>
    <View style={styles.modalTitleWrap}>
      <View style={styles.modalIconWrap}>
        <Ionicons name={icon} size={16} color="#0F766E" />
      </View>
      <View style={styles.modalHeadingTextWrap}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.modalIconButton} onPress={onClose}>
      <Ionicons name="close" size={18} color="#0F172A" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'rgba(7, 24, 42, 0.86)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(159, 207, 255, 0.18)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 38, 60, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.2)',
  },
  title: { color: '#E6F3FF', fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 44 },
  dashboardShell: { width: '100%' },
  dashboardShellWide: { alignSelf: 'center', maxWidth: 1500 },
  filterBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 10,
  },
  filterLeftPaneMobile: {
    width: '100%',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarActionsMobile: {
    width: '100%',
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: 'rgba(30, 64, 101, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.26)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportButtonMobile: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  pdfButton: {
    backgroundColor: 'rgba(46, 56, 97, 0.92)',
    borderColor: 'rgba(165, 180, 252, 0.28)',
  },
  exportButtonText: {
    color: '#DCEBFF',
    fontSize: 12,
    fontWeight: '600',
  },
  filterBar: {
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(138, 163, 192, 0.22)',
    backgroundColor: 'rgba(16, 31, 51, 0.74)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  filterLeftPane: {
    flex: 1,
  },
  searchBox: {
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(125, 160, 197, 0.28)',
    borderRadius: 10,
    backgroundColor: 'rgba(10, 25, 42, 0.84)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    color: '#D4E7FF',
    fontSize: 13,
    flex: 1,
    paddingVertical: 0,
  },
  statusTabs: {
    paddingTop: 10,
    paddingBottom: 0,
    gap: 8,
  },
  statusTab: {
    borderWidth: 1,
    borderColor: 'rgba(124, 146, 173, 0.34)',
    backgroundColor: 'rgba(17, 36, 57, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusTabActive: {
    borderColor: 'rgba(56, 189, 248, 0.55)',
    backgroundColor: 'rgba(16, 68, 94, 0.9)',
  },
  statusTabText: {
    color: '#A4BAD3',
    fontSize: 11,
    fontWeight: '600',
  },
  statusTabTextActive: {
    color: '#D7F4FF',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: '23.5%',
    backgroundColor: 'rgba(16, 34, 55, 0.82)',
    borderColor: 'rgba(140, 163, 191, 0.26)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4,
  },
  summaryCardMobile: {
    width: '48%',
  },
  summaryValue: { color: '#E6F3FF', fontSize: 26, fontWeight: '700' },
  summaryLabel: { color: '#8FB0D3', fontSize: 12, marginTop: 4, letterSpacing: 0.3 },
  sectionTitle: { color: '#E6F3FF', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  tableContainer: {
    borderWidth: 1,
    borderColor: 'rgba(138, 163, 192, 0.26)',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(12, 27, 45, 0.86)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  mobileListContainer: {
    gap: 10,
  },
  mobileListCard: {
    borderWidth: 1,
    borderColor: 'rgba(138, 163, 192, 0.26)',
    borderRadius: 12,
    backgroundColor: 'rgba(12, 27, 45, 0.86)',
    padding: 12,
  },
  mobileListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mobileAssetName: {
    color: '#E6F3FF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  mobileListMeta: {
    color: '#BFD4EA',
    fontSize: 12,
    marginBottom: 3,
  },
  tableInner: {
    minWidth: 1400,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 42, 66, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129, 156, 187, 0.3)',
  },
  tableHeaderCell: {
    color: '#B6CDEA',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderRightWidth: 1,
    borderRightColor: 'rgba(103, 130, 160, 0.2)',
  },
  tableBodyScroll: {
    maxHeight: 420,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(98, 123, 153, 0.2)',
    minHeight: 56,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: 'rgba(18, 36, 58, 0.52)',
  },
  tableCell: {
    color: '#D7E6F8',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRightWidth: 1,
    borderRightColor: 'rgba(88, 115, 146, 0.18)',
  },
  colAsset: { width: 210 },
  colSerial: { width: 150 },
  colAssignedTo: { width: 220 },
  colAssignedBy: { width: 220 },
  colDate: { width: 140 },
  colStatus: { width: 140 },
  colAction: { width: 120 },
  statusPillWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(88, 115, 146, 0.18)',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0,
  },
  viewButton: {
    backgroundColor: 'rgba(15, 77, 108, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mobileViewButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#D9F0FF',
    fontSize: 11,
    fontWeight: '600',
  },
  metaText: { color: '#D7E7F7', fontSize: 13, marginBottom: 2 },
  emptyText: { color: '#A9C6E4', fontSize: 13, marginTop: 6 },
  receiptProofContainer: {
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 55, 78, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  receiptProofTitle: {
    color: '#22D3EE',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  proofButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 118, 110, 0.85)',
  },
  proofButtonText: {
    color: '#E6F3FF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 14, 30, 0.68)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'rgba(30, 51, 78, 0.82)',
    borderColor: 'rgba(182, 214, 248, 0.35)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000B1F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 16,
  },
  modalAccentRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(141, 190, 255, 0.35)',
  },
  modalHandle: {
    width: 54,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(198, 224, 255, 0.45)',
  },
  detailModalCloseIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43, 66, 95, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(173, 203, 238, 0.38)',
  },
  detailModalBody: {
    paddingBottom: 12,
  },
  detailHeroRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailHeroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171, 207, 246, 0.45)',
    backgroundColor: 'rgba(37, 67, 102, 0.76)',
  },
  detailHeroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(201, 222, 248, 0.9)',
    backgroundColor: '#3A4C67',
  },
  detailHeroAvatarText: {
    color: '#EAF4FF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailModalTitle: {
    color: '#F2F7FF',
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 42,
  },
  detailModalSubtitle: {
    color: '#A8BED8',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 8,
  },
  detailGridColumn: {
    flex: 1,
    gap: 8,
  },
  infoBlock: {
    paddingVertical: 2,
  },
  infoBlockLabel: {
    color: '#AFC4DD',
    fontSize: 14,
    marginBottom: 1,
  },
  infoBlockValue: {
    color: '#F2F7FF',
    fontSize: 16,
    fontWeight: '600',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4E607B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 216, 243, 0.65)',
  },
  personAvatarText: {
    color: '#E8F1FC',
    fontSize: 10,
    fontWeight: '700',
  },
  detailDateRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  dateInfoBlock: {
    flex: 1,
  },
  dateInfoLabel: {
    color: '#AFC4DD',
    fontSize: 13,
    marginBottom: 4,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateInfoValue: {
    color: '#F2F7FF',
    fontSize: 15,
    fontWeight: '600',
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E9FAE',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
  },
  detailStatusText: {
    color: '#DFFAFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notesStrip: {
    marginTop: 2,
    marginBottom: 10,
  },
  notesLabel: {
    color: '#AFC4DD',
    fontSize: 14,
    marginBottom: 2,
  },
  notesValue: {
    color: '#F2F7FF',
    fontSize: 16,
    fontWeight: '500',
  },
  openProofButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(183, 214, 248, 0.42)',
    backgroundColor: 'rgba(46, 77, 114, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  openProofButtonText: {
    color: '#DCEBFC',
    fontSize: 13,
    fontWeight: '600',
  },
  detailModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(173, 203, 238, 0.28)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(38, 59, 87, 0.75)',
  },
  footerGhostButton: {
    borderWidth: 1,
    borderColor: 'rgba(173, 203, 238, 0.45)',
    backgroundColor: 'rgba(54, 77, 106, 0.62)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerGhostButtonText: {
    color: '#D9E9FC',
    fontSize: 14,
    fontWeight: '600',
  },
  footerPrimaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(130, 166, 255, 0.65)',
    backgroundColor: 'rgba(56, 96, 186, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerPrimaryButtonText: {
    color: '#EEF5FF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  modalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalHeadingTextWrap: {
    flex: 1,
  },
  modalIconButton: {
    width: 34,
    height: 34,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.16)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#0F766E',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  modalMessage: {
    color: '#334155',
    fontSize: 13,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  detailsContainer: {
    paddingVertical: 4,
  },
  detailLine: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValueMultiline: {
    lineHeight: 18,
  },
  photoRow: {
    paddingVertical: 6,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  proofPhoto: {
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    backgroundColor: '#E2E8F0',
  },
  proofPhotoMobile: {
    width: '100%',
    height: 220,
    marginRight: 0,
  },
  proofPhotoDesktop: {
    width: 180,
    height: 180,
  },
  modalCloseButton: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.45)',
    backgroundColor: '#0F766E',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ReportsScreen;
