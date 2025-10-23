import ApiClient from './apiClient';
import {
  Friend,
  SendFriendRequestResponse,
  FriendsListResponse,
  FriendRequestsResponse,
  FriendActionResponse,
} from '../../types/friend';

/**
 * FriendService handles all friend-related business logic
 *
 * This follows the singleton pattern like other services in the app.
 * It provides a clean interface for managing friend requests and friendships.
 */
class FriendService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  /**
   * Send a friend request to another user by username
   * @param username - The username of the person to send the request to
   * @returns The created friendship object
   * @throws Error if the request fails or if trying to add yourself
   */
  async sendFriendRequest(username: string): Promise<Friend> {
    try {
      const response = await this.apiClient.sendFriendRequest(username) as SendFriendRequestResponse;
      return response.friendship;
    } catch (error: any) {
      console.error('Error sending friend request:', error);

      // Handle specific error cases
      if (error.response?.status === 400) {
        const message = error.response?.data || 'Invalid request';
        throw new Error(typeof message === 'string' ? message : 'Cannot send friend request to yourself');
      }

      if (error.response?.status === 404) {
        throw new Error('User not found with that username');
      }

      throw new Error('Failed to send friend request');
    }
  }

  /**
   * Search for users by username
   * @param query - The search query (username or partial username)
   * @returns Array of matching users
   */
  async searchUsers(query: string): Promise<any[]> {
    try {
      const response = await this.apiClient.searchUsers(query);
      return response.users || [];
    } catch (error: any) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Accept a pending friend request
   * @param friendshipId - The friend_id of the pending request
   */
  async acceptFriendRequest(friendshipId: number): Promise<void> {
    try {
      await this.apiClient.acceptFriendRequest(friendshipId);
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      throw new Error('Failed to accept friend request');
    }
  }

  /**
   * Decline a pending friend request
   * @param friendshipId - The friend_id of the pending request
   */
  async declineFriendRequest(friendshipId: number): Promise<void> {
    try {
      await this.apiClient.declineFriendRequest(friendshipId);
    } catch (error: any) {
      console.error('Error declining friend request:', error);
      throw new Error('Failed to decline friend request');
    }
  }

  /**
   * Get list of all accepted friends
   * @returns Array of Friend objects with status 'accepted'
   */
  async getFriendsList(): Promise<Friend[]> {
    try {
      const response = await this.apiClient.getFriendsList() as FriendsListResponse;
      return response.friends || [];
    } catch (error: any) {
      console.error('Error fetching friends list:', error);
      throw new Error('Failed to load friends list');
    }
  }

  /**
   * Get list of pending friend requests sent TO the current user
   * These are requests the user can accept or decline
   * @returns Array of pending Friend objects
   */
  async getPendingRequests(): Promise<Friend[]> {
    try {
      const response = await this.apiClient.getPendingRequests() as FriendRequestsResponse;
      return response.requests || [];
    } catch (error: any) {
      console.error('Error fetching pending requests:', error);
      throw new Error('Failed to load pending requests');
    }
  }

  /**
   * Get list of friend requests sent BY the current user
   * These are requests waiting for the other user to respond
   * @returns Array of sent Friend objects
   */
  async getSentRequests(): Promise<Friend[]> {
    try {
      const response = await this.apiClient.getSentRequests() as FriendRequestsResponse;
      return response.requests || [];
    } catch (error: any) {
      console.error('Error fetching sent requests:', error);
      throw new Error('Failed to load sent requests');
    }
  }

  /**
   * Remove a friend (unfriend) or cancel a sent request
   * @param friendshipId - The friend_id to remove
   */
  async removeFriend(friendshipId: number): Promise<void> {
    try {
      await this.apiClient.removeFriend(friendshipId);
    } catch (error: any) {
      console.error('Error removing friend:', error);
      throw new Error('Failed to remove friend');
    }
  }
}

// Export as singleton instance
export default new FriendService();
