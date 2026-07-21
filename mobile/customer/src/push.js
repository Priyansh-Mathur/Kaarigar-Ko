import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission, gets an Expo push token, and registers it via POST /me/devices.
 * No-ops gracefully in Expo Go / simulators or when no EAS projectId is configured —
 * real push delivery needs a dev/EAS build.
 */
export async function registerForPush() {
  try {
    if (!Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const extra = Constants.expoConfig?.extra;
    const projectId = extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

    await Api.registerDevice({ fcmToken: token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' });
  } catch {
    // Expo Go / no projectId — push isn't available; safe to ignore.
  }
}
