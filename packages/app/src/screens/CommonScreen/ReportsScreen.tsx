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
import { reportStyles } from './ReportsScreenStyle';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

type ReportRow = {
  assignmentId: number | null;
  assetId: number;
  assetName: string;
  serialNo: string | null;
  assetStatus?: string;
  operatorEmployeeId: number | null;
  operatorName: string | null;
  supervisorEmployeeId: number | null;
  supervisorName: string | null;
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
  unassignedAssets?: number;
  maintenanceAssets?: number;
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

type StatusFilter = 'all' | 'assigned' | 'unassigned' | 'returned' | 'overdue' | 'maintenance';

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
  if (normalized === 'assigned') return '#38BDF8';
  if (normalized === 'unassigned') return '#94A3B8';
  if (normalized === 'maintenance') return '#FBBF24';
  return '#A5B4FC';
};

const statusBadgeBackground = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'overdue') return 'rgba(249, 115, 22, 0.16)';
  if (normalized === 'returned') return 'rgba(16, 185, 129, 0.16)';
  if (normalized === 'assigned') return 'rgba(14, 165, 233, 0.16)';
  if (normalized === 'unassigned') return 'rgba(148, 163, 184, 0.16)';
  if (normalized === 'maintenance') return 'rgba(251, 191, 36, 0.16)';
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

const parseNotes = (notesStr: string | null | undefined) => {
  if (!notesStr) return null;
  
  let jsonStr = notesStr;
  let prefix = '';
  
  // Handle cases where notes start with a tag like [RECEIPT_PROOF] before the JSON payload
  const firstBrace = notesStr.indexOf('{');
  const lastBrace = notesStr.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const beforeBrace = notesStr.substring(0, firstBrace).trim();
    if (beforeBrace.startsWith('[') && beforeBrace.endsWith(']')) {
      jsonStr = notesStr.substring(firstBrace, lastBrace + 1);
      prefix = beforeBrace + ' ';
    } else if (beforeBrace === '') {
      jsonStr = notesStr.substring(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed === 'object' && parsed !== null) {
      let photos: string[] = [];
      if (Array.isArray(parsed.proofPhotos)) {
        photos.push(...parsed.proofPhotos.filter(Boolean));
      } else if (typeof parsed.proofPhotos === 'string' && parsed.proofPhotos) {
        photos.push(parsed.proofPhotos);
      }
      
      if (Array.isArray(parsed.image)) {
        photos.push(...parsed.image.filter(Boolean));
      } else if (typeof parsed.image === 'string' && parsed.image) {
        photos.push(parsed.image);
      }

      const extractedMessage = parsed.message || parsed.notes || '';
      const finalMessage = extractedMessage ? extractedMessage : prefix.trim();

      return {
        message: finalMessage,
        proofCount: parsed.proofCount ?? photos.length,
        photos,
      };
    }
  } catch {}
  return { message: notesStr, proofCount: 0, photos: [] };
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
  const styles = reportStyles(isCompactLayout);
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

  // Removed unused isAdminRole

  const summaryCards = useMemo(() => [
    { label: 'Total Assets', value: summary.totalAssets ?? 0 },
    { label: 'Total Assignments', value: summary.totalAssignments ?? 0 },
    { label: 'Active', value: summary.activeAssignments ?? 0 },
    { label: 'Unassigned', value: summary.unassignedAssets ?? summary.officeAssets ?? 0 },
    { label: 'Overdue', value: summary.overdueAssignments ?? 0 },
    { label: 'Returned', value: summary.returnedAssignments ?? 0 },
    { label: 'Maintenance', value: summary.maintenanceAssets ?? summary.underMaintenanceAssets ?? 0 },
    { label: 'Pending Approval', value: summary.pendingApprovalConfirmations ?? 0 },
  ], [summary]);

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
        item.operatorEmployeeId != null ? String(item.operatorEmployeeId) : '',
        item.supervisorName,
        item.supervisorEmployeeId != null ? String(item.supervisorEmployeeId) : '',
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

    const body = filteredHistory.map((item) => {
      const parsed = parseNotes(item.notes);
      const cleanNotes = parsed ? parsed.message : (item.notes || '');

      return [
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
        cleanNotes,
      ];
    });

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

  // Memo: complete assignment history for the selected asset, sorted chronologically.
  // Only rows that have an actual assignment (assignmentId != null) are shown in the timeline.
  const assetHistory = useMemo(() => {
    if (!selectedRow) return [];
    return history
      .filter((item) => item.assetId === selectedRow.assetId && item.assignmentId != null)
      .sort((a, b) => {
        const da = new Date(a.assignedDate ?? '').getTime();
        const db = new Date(b.assignedDate ?? '').getTime();
        return da - db;
      });
  }, [history, selectedRow]);

  // Timeline UI will be rendered inside the detail modal after the notes section.


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
                    s={styles}
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
                    {(
                      [
                        { key: 'all', label: 'ALL' },
                        { key: 'assigned', label: 'ASSIGNED' },
                        { key: 'unassigned', label: 'UNASSIGNED' },
                        { key: 'returned', label: 'RETURNED' },
                        { key: 'overdue', label: 'OVERDUE' },
                        { key: 'maintenance', label: 'MAINTENANCE' },
                      ] as { key: StatusFilter; label: string }[]
                    ).map(({ key, label }) => {
                      const selected = statusFilter === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.statusTab, selected ? styles.statusTabActive : null]}
                          onPress={() => setStatusFilter(key)}
                        >
                          <Text style={[styles.statusTabText, selected ? styles.statusTabTextActive : null]}>
                            {label}
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
                    <View key={`${item.assetId}-${item.assignmentId ?? 'none'}`} style={styles.mobileListCard}>
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
                      <Text style={styles.mobileListMeta}>Assigned To: {item.operatorName || 'Not assigned'}{item.operatorEmployeeId != null ? ` (${item.operatorEmployeeId})` : ''}</Text>
                      <Text style={styles.mobileListMeta}>Assigned By: {item.supervisorName || 'N/A'}{item.supervisorEmployeeId != null ? ` (${item.supervisorEmployeeId})` : ''}</Text>
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
                          <View key={`${item.assetId}-${item.assignmentId ?? 'none'}`} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : null]}>
                            <Text style={[styles.tableCell, styles.colAsset]} numberOfLines={2}>{item.assetName}</Text>
                            <Text style={[styles.tableCell, styles.colSerial]} numberOfLines={1}>{item.serialNo || 'N/A'}</Text>
                            <Text style={[styles.tableCell, styles.colAssignedTo]} numberOfLines={2}>
                              {item.operatorName
                                ? `${item.operatorName}${item.operatorEmployeeId != null ? ` (${item.operatorEmployeeId})` : ''}`
                                : 'Not assigned'}
                            </Text>
                            <Text style={[styles.tableCell, styles.colAssignedBy]} numberOfLines={2}>
                              {item.supervisorName
                                ? `${item.supervisorName}${item.supervisorEmployeeId != null ? ` (${item.supervisorEmployeeId})` : ''}`
                                : 'N/A'}
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
                    <InfoBlock label="Assignment ID" value={selectedRow?.assignmentId != null ? String(selectedRow.assignmentId) : 'Unassigned'} s={styles} />
                    <InfoBlock label="Asset ID" value={String(selectedRow?.assetId || '-')} s={styles} />
                    <InfoBlock label="Serial Number" value={selectedRow?.serialNo || 'N/A'} s={styles} />
                    <InfoBlock label="Project" value={selectedRow?.projectName || 'N/A'} s={styles} />
                  </View>

                  <View style={styles.detailGridColumn}>
                    {selectedRow?.operatorName ? (
                      <PersonBlock
                        label="Assigned To"
                        name={selectedRow.operatorName}
                        extra={selectedRow.operatorEmployeeId != null ? `(${selectedRow.operatorEmployeeId})` : ''}
                        s={styles}
                      />
                    ) : (
                      <InfoBlock label="Assigned To" value="Not assigned" s={styles} />
                    )}
                    {selectedRow?.supervisorName ? (
                      <PersonBlock
                        label="Assigned By"
                        name={selectedRow.supervisorName}
                        extra={selectedRow.supervisorEmployeeId != null ? `(${selectedRow.supervisorEmployeeId})` : ''}
                        s={styles}
                      />
                    ) : (
                      <InfoBlock label="Assigned By" value="N/A" s={styles} />
                    )}
                    <InfoBlock label="Location" value={selectedRow?.location || 'N/A'} s={styles} />
                  </View>
                </View>

                <View style={styles.detailDateRow}>
                  <DateInfoBlock label="Assigned Date" value={formatDate(selectedRow?.assignedDate)} s={styles} />
                  <DateInfoBlock label="Expected Return Date" value={formatDate(selectedRow?.expectedReturnDate)} s={styles} />
                  <DateInfoBlock label="Returned Date" value={formatDate(selectedRow?.returnedDate)} s={styles} />
                  <View style={styles.dateInfoBlock}>
                    <Text style={styles.dateInfoLabel}>Status</Text>
                    <View style={styles.detailStatusBadge}>
                      <Text style={styles.detailStatusText}>{String(selectedRow?.status || '-').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* Timeline of assignments */}
                {assetHistory.length > 0 && (
                  <View style={styles.timelineContainer}>
                    {assetHistory.map((h, idx) => (
                      <View key={h.assignmentId} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        {idx < assetHistory.length - 1 && <View style={styles.timelineLine} />}
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineLabel}>Assigned To: {h.operatorName} ({h.operatorEmployeeId})</Text>
                          <Text style={styles.timelineDate}>{formatDate(h.assignedDate)}</Text>
                          <Text style={styles.timelineLabel}>Status: {h.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Notes */}
                {(() => {
                  const parsed = parseNotes(selectedRow?.notes);
                  return (
                    <View style={styles.notesStrip}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesValue}>
                        {parsed?.message || selectedRow?.notes || 'N/A'}
                      </Text>
                      {!!parsed?.proofCount && parsed.proofCount > 0 && (
                        <Text style={[styles.notesValue, { marginTop: 4, fontStyle: 'italic', color: '#64748b' }]}>
                          Proof Photos: {parsed.proofCount} attached
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </ScrollView>
              {(() => {
                const parsed = parseNotes(selectedRow?.notes);
                const photos = parsed?.photos || [];
                if (photos.length > 0) {
                  return (
                    <TouchableOpacity
                      style={styles.openProofButton}
                      onPress={() =>
                        openProofModal(
                          selectedRow?.assetName || '-',
                          parsed?.message || '',
                          photos
                        )
                      }>
                      <Ionicons name="images-outline" size={16} color="#D6E3F3" />
                      <Text style={styles.openProofButtonText}>
                        View Proof Photos ({photos.length})
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
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
                s={styles}
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
                        ] as any}
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

type ReportStyles = ReturnType<typeof reportStyles>;

const SummaryCard = ({
  label,
  value,
  compact,
  s,
}: {
  label: string;
  value: number;
  compact?: boolean;
  s: ReportStyles;
}) => (
  <View style={[s.summaryCard, compact ? s.summaryCardMobile : null]}>
    <Text style={s.summaryValue}>{value}</Text>
    <Text style={s.summaryLabel}>{label}</Text>
  </View>
);

const DetailLine = ({
  label,
  value,
  multiline,
  s,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  s: ReportStyles;
}) => (
  <View style={s.detailLine}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={[s.detailValue, multiline ? s.detailValueMultiline : null]} numberOfLines={multiline ? 5 : 2}>
      {value}
    </Text>
  </View>
);

const InfoBlock = ({ label, value, s }: { label: string; value: string; s: ReportStyles }) => (
  <View style={s.infoBlock}>
    <Text style={s.infoBlockLabel}>{label}</Text>
    <Text style={s.infoBlockValue}>{value}</Text>
  </View>
);

const PersonBlock = ({
  label,
  name,
  extra,
  s,
}: {
  label: string;
  name: string;
  extra: string;
  s: ReportStyles;
}) => (
  <View style={s.infoBlock}>
    <Text style={s.infoBlockLabel}>{label}</Text>
    <View style={s.personRow}>
      <View style={s.personAvatar}>
        <Text style={s.personAvatarText}>{getInitials(name)}</Text>
      </View>
      <Text style={s.infoBlockValue} numberOfLines={1}>{`${name} ${extra}`}</Text>
    </View>
  </View>
);

const DateInfoBlock = ({ label, value, s }: { label: string; value: string; s: ReportStyles }) => (
  <View style={s.dateInfoBlock}>
    <Text style={s.dateInfoLabel}>{label}</Text>
    <View style={s.dateValueRow}>
      <Ionicons name="calendar-outline" size={14} color="#9AB6D6" />
      <Text style={s.dateInfoValue}>{value}</Text>
    </View>
  </View>
);

const ModalHeader = ({
  title,
  subtitle,
  onClose,
  icon,
  s,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  s: ReportStyles;
}) => (
  <View style={s.modalHeader}>
    <View style={s.modalTitleWrap}>
      <View style={s.modalIconWrap}>
        <Ionicons name={icon} size={16} color="#0F766E" />
      </View>
      <View style={s.modalHeadingTextWrap}>
        <Text style={s.modalTitle}>{title}</Text>
        <Text style={s.modalSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <TouchableOpacity style={s.modalIconButton} onPress={onClose}>
      <Ionicons name="close" size={18} color="#0F172A" />
    </TouchableOpacity>
  </View>
);

export default ReportsScreen;
