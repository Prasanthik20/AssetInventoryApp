import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    Platform,
    Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { globalColors } from '../../styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';
import { toPersistentDataUrl } from '../../utils/imageHelper';

export interface ExtensionOption {
    label: string;
    days: number;
}

export const EXTENSION_OPTIONS: ExtensionOption[] = [
    { label: '3 Days', days: 3 },
    { label: '5 Days', days: 5 },
    { label: '7 Days', days: 7 },
    { label: '10 Days', days: 10 },
    { label: '15 Days', days: 15 },
    { label: '30 Days', days: 30 },
];

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string, proofImages?: string[], extensionDays?: number) => void;
    assetName: string;
    title?: string;
    requireProofImages?: boolean;
    minProofImages?: number;
    showExtensionOptions?: boolean;
    isManager?: boolean;
}

const OverdueNotificationModal: React.FC<Props> = ({
    visible,
    onClose,
    onSubmit,
    assetName,
    title,
    requireProofImages = false,
    minProofImages = 4,
    showExtensionOptions,
    isManager = false,
}) => {
    // If isManager is true, duration options are hidden by default unless explicitly overridden
    const shouldShowChips = showExtensionOptions !== undefined ? showExtensionOptions : !isManager;

    const [reason, setReason] = useState('');
    const [proofImages, setProofImages] = useState<string[]>([]);
    const [selectedDays, setSelectedDays] = useState<number>(7);
    const [errorText, setErrorText] = useState('');

    useEffect(() => {
        if (visible) {
            if (isManager) {
                setReason(`Your assigned asset "${assetName}" is overdue. Please provide the reason for overdue status and request an extension if required.`);
            } else {
                setReason('');
            }
            setProofImages([]);
            setSelectedDays(7);
            setErrorText('');
        }
    }, [visible, isManager, assetName]);

    const pickImage = async (useCamera: boolean) => {
        try {
            if (useCamera) {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (permissionResult.status !== 'granted') {
                    setErrorText('Camera permission is required to attach proof images.');
                    return;
                }
            }

            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                allowsEditing: true,
                allowsMultipleSelection: !useCamera,
                selectionLimit: 0,
                quality: 0.2,
                base64: true,
            };

            if (options.allowsMultipleSelection) {
                delete options.allowsEditing;
                delete options.aspect;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (result.canceled) {
                return;
            }

            const selectedImages: string[] = [];
            for (const asset of result.assets) {
                try {
                    const dataUrl = await toPersistentDataUrl(asset.uri, asset.mimeType || undefined);
                    if (dataUrl) {
                        selectedImages.push(dataUrl);
                    }
                } catch (err) {
                    console.warn("Error processing image:", err);
                }
            }

            if (selectedImages.length === 0) {
                setErrorText('Could not process selected images. Please try again.');
                return;
            }

            setProofImages((prev) => [...prev, ...selectedImages]);
            setErrorText('');
        } catch (error) {
            console.error('Library error:', error);
            setErrorText('Failed to select images.');
        }
    };

    const handlePickProofImages = () => {
        if (Platform.OS === 'web') {
            pickImage(false);
        } else {
            Alert.alert(
                "Upload Proof Images",
                "Choose an option",
                [
                    { text: "Take Photo", onPress: () => pickImage(true) },
                    { text: "Choose from Gallery", onPress: () => pickImage(false) },
                    { text: "Cancel", style: "cancel" }
                ]
            );
        }
    };

    const handleSubmit = () => {
        if (!reason.trim()) {
            setErrorText(isManager ? 'Please enter message to employee.' : 'Please provide reason for overdue/extension.');
            return;
        }

        if (requireProofImages && proofImages.length < minProofImages) {
            setErrorText(`Please attach at least ${minProofImages} proof images.`);
            return;
        }

        setErrorText('');

        if (isManager) {
            onSubmit(reason.trim(), requireProofImages ? proofImages : undefined, undefined);
        } else {
            const selectedOptionLabel = EXTENSION_OPTIONS.find(o => o.days === selectedDays)?.label || `${selectedDays} Days`;
            const formattedPayloadMessage = `Reason: ${reason.trim()}\nRequested Extension: ${selectedOptionLabel} (${selectedDays} days)`;

            onSubmit(formattedPayloadMessage, requireProofImages ? proofImages : undefined, selectedDays);
        }
    };

    const modalTitleText = title || (isManager ? 'Ask Employee for Overdue Reason' : 'Provide Overdue Reason & Request Extension');

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>

                    {/* CLOSE BUTTON */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Feather name="x" size={24} color="#555" />
                    </TouchableOpacity>

                    {/* TITLE */}
                    <Text style={styles.modalTitle}>
                        {modalTitleText}
                    </Text>

                    {/* SUBTITLE */}
                    <Text style={styles.modalSubtitle}>
                        Asset: <Text style={{ fontWeight: 'bold', color: '#22D3EE' }}>{assetName}</Text>
                    </Text>

                    {/* EXTENSION DAYS DURATION PICKER CHIPS (Employee Mode) */}
                    {shouldShowChips && (
                        <View style={styles.durationSection}>
                            <Text style={styles.sectionLabel}>Select Required Extension Duration:</Text>
                            <View style={styles.chipsRow}>
                                {EXTENSION_OPTIONS.map((opt) => {
                                    const isSelected = selectedDays === opt.days;
                                    return (
                                        <TouchableOpacity
                                            key={opt.days}
                                            style={[styles.chip, isSelected && styles.chipSelected]}
                                            onPress={() => setSelectedDays(opt.days)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons
                                                name={isSelected ? "checkmark-circle" : "time-outline"}
                                                size={14}
                                                color={isSelected ? "#FFF" : "#94A3B8"}
                                            />
                                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* REASON INPUT */}
                    <Text style={styles.inputLabel}>
                        {isManager ? 'Message to Employee:' : 'Reason / Remarks for Extension:'}
                    </Text>
                    <TextInput
                        style={styles.reasonInput}
                        placeholder={isManager ? "Enter notification message to employee..." : "Explain why asset return date needs to be extended..."}
                        placeholderTextColor="#888"
                        multiline
                        value={reason}
                        onChangeText={setReason}
                    />

                    {requireProofImages && (
                        <View style={styles.proofContainer}>
                            <TouchableOpacity style={styles.proofButton} onPress={handlePickProofImages}>
                                <Text style={styles.proofButtonText}>Upload Proof Images (All Directions)</Text>
                            </TouchableOpacity>
                            <Text style={styles.proofHintText}>
                                Selected: {proofImages.length} / minimum {minProofImages}
                            </Text>
                            {proofImages.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {proofImages.map((uri, index) => (
                                        <Image key={`proof-${index}`} source={{ uri }} style={styles.proofThumbnail} />
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    )}

                    {!!errorText && (
                        <Text style={styles.errorText}>{errorText}</Text>
                    )}

                    {/* SUBMIT BUTTON */}
                    <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                        <LinearGradient
                            colors={isManager ? ['#DC2626', '#EF4444'] : ['#27B2C3', '#40D69B']}
                            style={styles.submitButtonGradient}
                        >
                            <Text style={styles.submitButtonText}>
                                {isManager ? 'Send Overdue Alert to Employee' : `Submit Extension Request (${selectedDays} Days)`}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: globalColors.overlayDark,
    },
    modalView: {
        width: '90%',
        maxWidth: 520,
        backgroundColor: globalColors.surfacePrimary,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: globalColors.textTitle,
        marginBottom: 6,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: globalColors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    durationSection: {
        width: '100%',
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E2E8F0',
        marginBottom: 8,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    chipSelected: {
        backgroundColor: '#0284C7',
        borderColor: '#38BDF8',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    chipTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E2E8F0',
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    reasonInput: {
        width: '100%',
        height: 100,
        backgroundColor: globalColors.surfacePrimary,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: globalColors.borderSoft,
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
        marginBottom: 16,
        color: globalColors.textTitle,
    },
    errorText: {
        color: '#F97373',
        fontSize: 13,
        alignSelf: 'flex-start',
        marginTop: -6,
        marginBottom: 12,
    },
    submitButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitButtonText: {
        color: globalColors.surfacePrimary,
        fontSize: 15,
        fontWeight: 'bold',
    },
    proofContainer: {
        width: '100%',
        marginBottom: 14,
    },
    proofButton: {
        width: '100%',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: globalColors.borderSoft,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 8,
    },
    proofButtonText: {
        color: globalColors.textTitle,
        fontWeight: '700',
        fontSize: 13,
    },
    proofHintText: {
        color: globalColors.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    proofThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: globalColors.borderSoft,
    },
});

export default OverdueNotificationModal;
