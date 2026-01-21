export interface Notification {
  notification_id: string;
  user_id: string;
  type: string; // 'visit_started', 'visit_ended', 'friend_request', etc.
  title: string;
  message: string;
  related_user_id?: string;
  related_place_id?: string;
  related_visit_id?: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unread_count: number;
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}
