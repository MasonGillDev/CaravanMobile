import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

interface PlaceNotificationData {
  sessionId: string;
  placeId: string;
  placeName: string;
  type: 'rating_prompt';
}

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private notificationListener: any;
  private responseListener: any;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  async scheduleRatingNotification(data: PlaceNotificationData): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "How was your visit?",
        body: `Rate your experience at ${data.placeName}`,
        data: {
          ...data,
          action: 'open_rating',
        },
        categoryIdentifier: 'rating_prompt',
      },
      trigger: {
        type: 'timeInterval',
        seconds: 600, // 10 minutes
      } as any, // Type assertion needed due to expo-notifications type issues
    });

    return notificationId;
  }

  async showRatingNotification(data: PlaceNotificationData): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "How was your visit?",
        body: `Rate your experience at ${data.placeName}`,
        data: {
          ...data,
          action: 'open_rating',
        },
        categoryIdentifier: 'rating_prompt',
      },
      trigger: null, // Show immediately
    });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  registerNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    // This listener is triggered when a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

    // This listener is triggered when a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  }

  unregisterNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('rating_prompt', [
        {
          identifier: 'rate_now',
          buttonTitle: 'Rate Now',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }
}

export default NotificationService;