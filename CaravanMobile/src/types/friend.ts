import { User } from './user';

/**
 * Represents a friendship/friend request between two users
 * Status can be: pending, accepted, declined, blocked
 */
export interface Friend {
  friend_id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;

  // Optional embedded user info when the backend joins user data
  requester?: User;
  addressee?: User;
}

/**
 * Possible states of a friendship
 */
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

/**
 * Response from sending a friend request
 */
export interface SendFriendRequestResponse {
  message: string;
  friendship: Friend;
}

/**
 * Response from getting friends list
 */
export interface FriendsListResponse {
  friends: Friend[];
  count: number;
}

/**
 * Response from getting pending/sent requests
 */
export interface FriendRequestsResponse {
  requests: Friend[];
  count: number;
}

/**
 * Response from accepting/declining/removing a friend
 */
export interface FriendActionResponse {
  message: string;
}
