import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Notification } from '../types/notification';

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'visit_started':
        return 'location';
      case 'visit_ended':
        return 'checkmark-circle';
      case 'friend_request':
        return 'person-add';
      case 'rating_reminder':
        return 'star';
      case 'mention':
        return 'at';
      default:
        return 'notifications';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  const startShake = () => {
    // Create shake animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopShake = () => {
    shakeAnimation.stopAnimation();
    Animated.spring(shakeAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    // Start the long press timer
    longPressTimeout.current = setTimeout(() => {
      setIsDeleting(true);
      startShake();
    }, 500); // 500ms hold to activate delete mode
  };

  const handlePressOut = () => {
    // Clear the timer if user releases before long press
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    if (isDeleting) {
      // Delete the notification with animation
      stopShake();
      Animated.timing(scaleAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onDelete(notification.notification_id);
      });
    } else {
      // Regular tap - handle notification press
      onPress(notification);
    }
  };

  const handleCancel = () => {
    // User moved finger away - cancel delete
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    if (isDeleting) {
      setIsDeleting(false);
      stopShake();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: shakeAnimation },
            { scale: scaleAnimation },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.read && styles.unread,
          isDeleting && styles.deleting,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => {}} // Required to prevent default long press behavior
        delayLongPress={10000} // Set high to prevent default long press
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={getNotificationIcon(notification.type) as any}
            size={24}
            color={notification.read ? theme.colors.gray[400] : theme.colors.primary}
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, !notification.read && styles.unreadText]}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.timestamp}>{getTimeAgo(notification.created_at)}</Text>
        </View>

        {!notification.read && <View style={styles.unreadDot} />}

        {isDeleting && (
          <View style={styles.deleteIndicator}>
            <Ionicons name="trash" size={20} color={theme.colors.white} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unread: {
    backgroundColor: theme.colors.primary + '08',
  },
  deleting: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.danger + '10',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    marginBottom: 4,
  },
  unreadText: {
    color: theme.colors.dark,
    fontWeight: theme.fontWeight.bold,
  },
  message: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginBottom: 4,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[400],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    alignSelf: 'center',
  },
  deleteIndicator: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
