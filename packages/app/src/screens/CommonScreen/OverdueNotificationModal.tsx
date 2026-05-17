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
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { globalColors } from '../../styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string, proofImages?: string[]) => void;
    assetName: string;
    title?: string;
    requireProofImages?: boolean;
    minProofImages?: number;
}

const OverdueNotificationModal: React.FC<Props> = ({
    visible,
    onClose,
    onSubmit,
    assetName,
    title,
    requireProofImages = false,
    minProofImages = 4,
}) => {

    const [reason, setReason] = useState('');
    const [proofImages, setProofImages] = useState<string[]>([]);
    const [errorText, setErrorText] = useState('');

    // 🔥 Auto-clear input each time modal opens
    useEffect(() => {
        if (visible) {
            setReason('');
            setProofImages([]);
            setErrorText('');
        }
    }, [visible]);

    const handlePickProofImages = async () => {
        Alert.alert(
            "Attach Proof",
            "Take photos or choose from gallery",
            [
                { text: "Camera", onPress: () => launchCamera() },
                { text: "Gallery", onPress: () => launchLibrary() },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const launchCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                setErrorText('Camera permission is required.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.5,
                base64: true,
            });

            processResult(result);
        } catch (error) {
            console.error('Camera error:', error);
            setErrorText('Failed to open camera.');
        }
    };

    const launchLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                setErrorText('Media library permission is required.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 0,
                quality: 0.5,
                base64: true,
            });

            processResult(result);
        } catch (error) {
            console.error('Library error:', error);
            setErrorText('Failed to select images.');
        }
    };

    const processResult = (result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled && result.assets) {
            const selectedImages = result.assets
                .map((asset) => {
                    if (asset.base64) {
                        return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
                    }
                    return null;
                })
                .filter((value): value is string => Boolean(value));

            if (selectedImages.length > 0) {
                setProofImages((prev) => [...prev, ...selectedImages]);
                setErrorText('');
            } else {
                setErrorText('No valid images processed.');
            }
        }
    };

    const handleSubmit = () => {
        if (!reason.trim()) {
            setErrorText('Please provide details.');
            return;
        }

        if (requireProofImages && proofImages.length < minProofImages) {
            setErrorText(`Please attach at least ${minProofImages} proof images.`);
            return;
        }

        setErrorText('');
        onSubmit(reason, requireProofImages ? proofImages : undefined);
    };

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
                        {title || 'Provide Details'}
                    </Text>

                    {/* SUBTITLE */}
                    <Text style={styles.modalSubtitle}>
                        Enter message for: <Text style={{ fontWeight: 'bold' }}>{assetName}</Text>
                    </Text>

                    {/* INPUT */}
                    <TextInput
                        style={styles.reasonInput}
                        placeholder="Enter your message..."
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
                            colors={['#27B2C3', '#40D69B']}
                            style={styles.submitButtonGradient}
                        >
                            <Text style={styles.submitButtonText}>
                                {title?.includes("Reply") ? "Send Reply" : "Send Notification"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};

// ---------------------------
// 🔹 STYLES
// ---------------------------

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: globalColors.overlayDark,
    },
    modalView: {
        width: '90%',
        maxWidth: 500,
        backgroundColor: globalColors.surfacePrimary,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        elevation: 6,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: globalColors.textTitle,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 15,
        color: globalColors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    reasonInput: {
        width: '100%',
        height: 120,
        backgroundColor: globalColors.surfacePrimary,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: globalColors.borderSoft,
        padding: 15,
        fontSize: 15,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: globalColors.textTitle,
    },
    errorText: {
        color: '#F97373',
        fontSize: 13,
        alignSelf: 'flex-start',
        marginTop: -10,
        marginBottom: 12,
    },
    submitButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitButtonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    submitButtonText: {
        color: globalColors.surfacePrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    proofContainer: {
        width: '100%',
        marginBottom: 16,
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
        fontSize: 14,
    },
    proofHintText: {
        color: globalColors.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    proofThumbnail: {
        width: 64,
        height: 64,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: globalColors.borderSoft,
    },
});

export default OverdueNotificationModal;
