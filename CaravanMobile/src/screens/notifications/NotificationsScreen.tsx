import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NotificationCard } from '../../components/NotificationCard';
import ApiClient from '../../services/api/apiClient';
import { theme } from '../../styles/theme';
import { Notification } from '../../types/notification';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const apiClient = ApiClient.getInstance();

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.getNotifications();
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unread_count || 0);
      }
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await apiClient.markNotificationAsRead(notification.notification_id);
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.notification_id === notification.notification_id
              ? { ...n, read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'mention' && notification.data?.post_id) {
      // Navigate to the post detail screen
      navigation.navigate('PostDetail' as never, { postId: notification.data.post_id } as never);
    }
    // Add other notification type handlers here as needed
    // if (notification.type === 'visit_started') {
    //   navigation.navigate('Profile');
    // }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.notification_id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <NotificationCard
      notification={item}
      onPress={handleNotificationPress}
      onDelete={handleDeleteNotification}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color={theme.colors.accent}
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.notification_id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
  },
  markAllButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  markAllText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
});
