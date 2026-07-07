import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { baseURL } from '../navigation/types';

// Configure foreground notifications behavior on mobile
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldVibrate: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Synthesizes a premium double-chime sound on web browsers.
 * This is 100% offline-ready, requires no audio files, and is compliant with modern autoplay policies.
 */
const playWebChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02); // clean fade in
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration); // decay
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // Double chime sound: C6 (1046.50Hz) and E6 (1318.51Hz)
    playTone(1046.50, now, 0.25);
    playTone(1318.51, now + 0.08, 0.4);
  } catch (e) {
    console.warn('Failed to play web notification chime:', e);
  }
};

interface User {
  employeeId: number;
  roleName: string;
  fullName: string;
}

export function useNotificationListener(user: User | null) {
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);
  const intervalIdRef = useRef<any>(null);

  // 1. Request necessary permissions on load
  useEffect(() => {
    if (!user) return;

    const setupPermissions = async () => {
      try {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
              await Notification.permission;
              await Notification.requestPermission();
            }
          }
        } else {
          // Native mobile permission check
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== 'granted') {
            console.warn('Notification permissions not granted on mobile!');
          }
        }
      } catch (err) {
        console.error('Error requesting notification permissions:', err);
      }
    };

    setupPermissions();
  }, [user]);

  // 2. Poll the server for notifications
  useEffect(() => {
    if (!user?.employeeId) {
      seenNotificationIds.current.clear();
      isInitialLoad.current = true;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      return;
    }

    const checkNotifications = async () => {
      try {
        const isSupervisor = user.roleName.toLowerCase() === 'supervisor';
        const endpoint = isSupervisor
          ? `${baseURL}/api/notifications/supervisor?id=${user.employeeId}`
          : `${baseURL}/api/notifications/operator?id=${user.employeeId}`;

        const response = await axios.get(endpoint);
        const notifications: any[] = response.data.notifications || [];

        let newNotificationFound = false;
        let latestNotification: any = null;

        notifications.forEach((item: any) => {
          // Standardize ID string mapping
          const id = String(item.notificationId || item.id || '');
          if (!id) return;

          if (!seenNotificationIds.current.has(id)) {
            seenNotificationIds.current.add(id);
            if (!isInitialLoad.current) {
              newNotificationFound = true;
              latestNotification = item;
            }
          }
        });

        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        } else if (newNotificationFound && latestNotification) {
          triggerAlert(latestNotification);
        }
      } catch (err) {
        console.warn('Failed to poll notifications for sound listener:', err);
      }
    };

    // Helper to send alerts and play sound
    const triggerAlert = async (notification: any) => {
      const sender = notification.senderName || notification.sender?.name || 'Asset System';
      const reason = notification.reason || 'New updates available';
      const asset = notification.assetName || (notification.asset ? notification.asset.name : '');
      const title = `Asset System Alert`;
      const body = `${sender}: ${reason}${asset ? ` for ${asset}` : ''}`;

      // Play Sound + Vibrate
      if (Platform.OS === 'web') {
        playWebChime();
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(title, { body });
          }
        }
      } else {
        // Vibrate mobile device
        Vibration.vibrate([0, 150, 100, 150]);
        // Trigger OS notification banner & default system notification sound
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true, // Will play default notification sound on mobile
          },
          trigger: null,
        });
      }
    };

    // Run immediately and poll every 15 seconds
    checkNotifications();
    intervalIdRef.current = setInterval(checkNotifications, 15000);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [user]);

  return null;
}
