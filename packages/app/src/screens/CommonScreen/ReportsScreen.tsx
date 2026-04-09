import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
};

type ReceiptProofPayload = {
  kind?: string;
  message?: string;
  proofCount?: number;
  proofPhotos?: string[];
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
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

const ReportsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { employeeId, roleName } = route.params;
  const { width, height } = useWindowDimensions();
  const isCompactLayout = width < 768;
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({
    totalAssignments: 0,
    activeAssignments: 0,
    returnedAssignments: 0,
    overdueAssignments: 0,
  });
  const [history, setHistory] = useState<ReportRow[]>([]);
  const [proofModalVisible, setProofModalVisible] = useState(false);
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

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/reports/asset-history`, {
        params: { employeeId },
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
  }, [employeeId]);

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

  return (
    <ImageBackground
      source={require('../../assets/Company-bg.webp')}
      style={styles.background}
      resizeMode="cover"
      blurRadius={5}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
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
            <View style={styles.summaryGrid}>
              <SummaryCard label="Total" value={summary.totalAssignments} />
              <SummaryCard label="Active" value={summary.activeAssignments} />
              <SummaryCard label="Returned" value={summary.returnedAssignments} />
              <SummaryCard label="Overdue" value={summary.overdueAssignments} />
            </View>

            <Text style={styles.sectionTitle}>Employee Asset History</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No history found.</Text>
            ) : (
              history.map((item) => (
                <View key={item.assignmentId} style={styles.card}>
                  {(() => {
                    const receiptProof = parseReceiptProofNote(item.notes);
                    return (
                      <>
                  <Text style={styles.assetName}>{item.assetName}</Text>
                  <Text style={styles.metaText}>Asset ID: {item.assetId} | S/N: {item.serialNo || 'N/A'}</Text>
                  <Text style={styles.metaText}>Operator: {item.operatorName} ({item.operatorEmployeeId})</Text>
                  <Text style={styles.metaText}>Supervisor: {item.supervisorName} ({item.supervisorEmployeeId})</Text>
                  <Text style={styles.metaText}>Project: {item.projectName || 'N/A'}</Text>
                  {receiptProof.isReceiptProof ? (
                    <View style={styles.receiptProofContainer}>
                      <Text style={styles.receiptProofTitle}>Asset receipt confirmation</Text>
                      <Text style={styles.metaText}>Message: {receiptProof.message || 'Received'}</Text>
                      <TouchableOpacity
                        style={styles.proofButton}
                        onPress={() => openProofModal(item.assetName, receiptProof.message, receiptProof.photos)}
                      >
                        <Text style={styles.proofButtonText}>
                          View Photos ({receiptProof.proofCount || receiptProof.photos.length || 0})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.metaText}>Notes: {item.notes || 'N/A'}</Text>
                  )}
                  <Text style={styles.metaText}>Location: {item.location || 'N/A'}</Text>
                  <Text style={styles.metaText}>Assigned: {formatDate(item.assignedDate)}</Text>
                  <Text style={styles.metaText}>Expected Return: {formatDate(item.expectedReturnDate)}</Text>
                  <Text style={styles.metaText}>Returned: {formatDate(item.returnedDate)}</Text>
                  <Text style={styles.status}>Status: {item.status}</Text>
                      </>
                    );
                  })()}
                </View>
              ))
            )}
          </ScrollView>
        )}

        <Modal
          visible={proofModalVisible}
          animationType="slide"
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
              <Text style={styles.modalTitle}>Asset Receipt Confirmation</Text>
              <Text style={styles.modalSubtitle}>{selectedProof?.assetName || '-'}</Text>
              <Text style={styles.metaText}>Message: {selectedProof?.message || 'Received'}</Text>

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

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
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
  title: { color: '#E6F3FF', fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 44 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: 'rgba(15, 40, 70, 0.8)',
    borderColor: 'rgba(159, 207, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  summaryValue: { color: '#22D3EE', fontSize: 22, fontWeight: '700' },
  summaryLabel: { color: '#A9C6E4', fontSize: 13, marginTop: 4 },
  sectionTitle: { color: '#E6F3FF', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  card: {
    backgroundColor: 'rgba(10, 33, 58, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.18)',
    padding: 12,
    marginBottom: 10,
  },
  assetName: { color: '#22D3EE', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  metaText: { color: '#D7E7F7', fontSize: 13, marginBottom: 2 },
  status: { color: '#FCD34D', fontSize: 13, fontWeight: '700', marginTop: 4 },
  emptyText: { color: '#A9C6E4' },
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
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'center',
    padding: 16,
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'rgba(10, 33, 58, 0.98)',
    borderColor: 'rgba(159, 207, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  modalTitle: {
    color: '#E6F3FF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#22D3EE',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '600',
  },
  photoRow: {
    paddingVertical: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  proofPhoto: {
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.25)',
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
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 64, 175, 0.85)',
  },
  modalCloseButtonText: {
    color: '#E6F3FF',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default ReportsScreen;
