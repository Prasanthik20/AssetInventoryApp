import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { globalColors } from '../../styles/globalStyles';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    assetName: string;
    title?: string;
}

const OverdueNotificationModal: React.FC<Props> = ({
    visible,
    onClose,
    onSubmit,
    assetName,
    title
}) => {

    const [reason, setReason] = useState('');
    const [errorText, setErrorText] = useState('');

    // 🔥 Auto-clear input each time modal opens
    useEffect(() => {
        if (visible) {
            setReason('');
            setErrorText('');
        }
    }, [visible]);

    const handleSubmit = () => {
        if (!reason.trim()) {
            setErrorText('Please provide details.');
            return;
        }
        setErrorText('');
        onSubmit(reason);
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
});

export default OverdueNotificationModal;
