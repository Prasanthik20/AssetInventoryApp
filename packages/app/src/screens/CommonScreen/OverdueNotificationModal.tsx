import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    assetName: string;
}

const OverdueNotificationModal: React.FC<Props> = ({ visible, onClose, onSubmit, assetName }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            Alert.alert("Reason Required", "Please provide a reason for the delay.");
            return;
        }
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
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Feather name="x" size={24} color="#555" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Notify Supervisor</Text>
                    <Text style={styles.modalSubtitle}>
                        Provide a reason for the overdue status of: <Text style={{ fontWeight: 'bold' }}>{assetName}</Text>
                    </Text>

                    <TextInput
                        style={styles.reasonInput}
                        placeholder="e.g., Project extended, equipment requires maintenance..."
                        placeholderTextColor="#888"
                        multiline
                        value={reason}
                        onChangeText={setReason}
                    />

                    <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                         <LinearGradient colors={['#27B2C3', '#40D69B']} style={styles.submitButtonGradient}>
                            <Text style={styles.submitButtonText}>Send Notification</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalView: {
        width: '90%',
        maxWidth: 500,
        backgroundColor: '#F7F8FC',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A202C',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 15,
        color: '#4A5568',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    reasonInput: {
        width: '100%',
        height: 120,
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        padding: 15,
        fontSize: 15,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: '#1A202C',
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
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default OverdueNotificationModal;