import ApiClient from './apiClient';
import {
  Post,
  PostReply,
  CreatePostRequest,
  CreateReplyRequest,
  FeedResponse,
  PostDetailResponse,
} from '../../types/post';

/**
 * PostService handles all social feed post-related business logic
 *
 * This follows the singleton pattern like other services in the app.
 * It provides a clean interface for managing posts, votes, and replies.
 */
class PostService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  /**
   * Create a new post at the user's current location
   * @param content - The post content (max 500 characters)
   * @param latitude - Current latitude
   * @param longitude - Current longitude
   * @returns The created post
   */
  async createPost(content: string, latitude: number, longitude: number): Promise<Post> {
    try {
      const response = await this.apiClient.createPost({
        content,
        latitude,
        longitude,
      });
      return response.post;
    } catch (error: any) {
      console.error('Error creating post:', error);

      if (error.response?.status === 400) {
        const message = error.response?.data;
        if (typeof message === 'string') {
          throw new Error(message);
        }
        throw new Error('Invalid post content or location');
      }

      throw new Error('Failed to create post');
    }
  }

  /**
   * Get feed posts within a radius of the user's location
   * @param latitude - Current latitude
   * @param longitude - Current longitude
   * @param radius - Radius in kilometers (default: 5km)
   * @param limit - Maximum posts to fetch (default: 20)
   * @param offset - Pagination offset (default: 0)
   * @returns Feed response with posts
   */
  async getFeed(
    latitude: number,
    longitude: number,
    radius: number = 5,
    limit: number = 20,
    offset: number = 0
  ): Promise<FeedResponse> {
    try {
      const response = await this.apiClient.getFeed({
        latitude,
        longitude,
        radius,
        limit,
        offset,
      });
      return response;
    } catch (error: any) {
      console.error('Error fetching feed:', error);
      throw new Error('Failed to load feed');
    }
  }

  /**
   * Get a single post with its replies
   * @param postId - The post ID
   * @returns Post detail with replies
   */
  async getPost(postId: string): Promise<PostDetailResponse> {
    try {
      const response = await this.apiClient.getPost(postId);
      return response;
    } catch (error: any) {
      console.error('Error fetching post:', error);

      if (error.response?.status === 404) {
        throw new Error('Post not found');
      }

      throw new Error('Failed to load post');
    }
  }

  /**
   * Delete a post (only the post owner can delete)
   * @param postId - The post ID to delete
   */
  async deletePost(postId: string): Promise<void> {
    try {
      await this.apiClient.deletePost(postId);
    } catch (error: any) {
      console.error('Error deleting post:', error);

      if (error.response?.status === 403) {
        throw new Error('You can only delete your own posts');
      }

      throw new Error('Failed to delete post');
    }
  }

  /**
   * Vote on a post
   * @param postId - The post ID
   * @param voteType - 1 for upvote, -1 for downvote, 0 to remove vote
   */
  async voteOnPost(postId: string, voteType: number): Promise<void> {
    try {
      await this.apiClient.voteOnPost(postId, voteType);
    } catch (error: any) {
      console.error('Error voting on post:', error);

      if (error.response?.status === 400) {
        throw new Error('Invalid vote type');
      }

      throw new Error('Failed to vote on post');
    }
  }

  /**
   * Upvote a post
   * @param postId - The post ID
   */
  async upvote(postId: string): Promise<void> {
    return this.voteOnPost(postId, 1);
  }

  /**
   * Downvote a post
   * @param postId - The post ID
   */
  async downvote(postId: string): Promise<void> {
    return this.voteOnPost(postId, -1);
  }

  /**
   * Remove vote from a post
   * @param postId - The post ID
   */
  async removeVote(postId: string): Promise<void> {
    return this.voteOnPost(postId, 0);
  }

  /**
   * Create a reply to a post
   * @param postId - The post ID to reply to
   * @param content - The reply content (max 300 characters)
   * @returns The created reply
   */
  async createReply(postId: string, content: string): Promise<PostReply> {
    try {
      const response = await this.apiClient.createReply(postId, content);
      return response.reply;
    } catch (error: any) {
      console.error('Error creating reply:', error);

      if (error.response?.status === 400) {
        const message = error.response?.data;
        if (typeof message === 'string') {
          throw new Error(message);
        }
        throw new Error('Invalid reply content');
      }

      throw new Error('Failed to create reply');
    }
  }

  /**
   * Delete a reply (only the reply owner can delete)
   * @param replyId - The reply ID to delete
   */
  async deleteReply(replyId: string): Promise<void> {
    try {
      await this.apiClient.deleteReply(replyId);
    } catch (error: any) {
      console.error('Error deleting reply:', error);

      if (error.response?.status === 403) {
        throw new Error('You can only delete your own replies');
      }

      throw new Error('Failed to delete reply');
    }
  }
}

// Export as singleton instance
export default new PostService();
