import { PushNotifications } from '@capacitor/push-notifications';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export class CapacitorService {
  static isNative() {
    return Capacitor.isNativePlatform();
  }

  // Push Notifications
  static async initPush() {
    if (!this.isNative()) return;

    // Request permission to use push notifications
    // iOS will prompt user and return if they granted permission or not
    // Android will return granted unless previously denied
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('User denied permissions!');
    }

    await PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Here you would typically send the token to your server
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });
  }

  // Biometric Auth
  static async performBiometricAuth(reason: string = 'Authenticate to access AgentGuard') {
    if (!this.isNative()) {
      console.log('Biometric auth skipped: Not a native platform');
      return true; // Assume success on web for demo/dev
    }

    try {
      const result = await NativeBiometric.isAvailable();
      
      if (!result.isAvailable) {
        console.warn('Biometric auth not available');
        return false;
      }

      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Biometric Login',
        subtitle: 'Log in using your biometric credentials',
        description: 'Please authenticate to continue',
      });

      return true;
    } catch (error) {
      console.error('Biometric auth failed:', error);
      return false;
    }
  }
}
