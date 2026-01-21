export interface Post {
  post_id: string;
  user_id: string;
  content: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Computed fields
  username?: string;
  vote_score: number;
  reply_count: number;
  user_vote?: number; // null if not voted, 1 for upvote, -1 for downvote
}

export interface PostReply {
  reply_id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Computed fields
  username?: string;
}

export interface CreatePostRequest {
  content: string;
  latitude: number;
  longitude: number;
}

export interface VoteRequest {
  vote_type: number; // 1 for upvote, -1 for downvote, 0 to remove vote
}

export interface CreateReplyRequest {
  content: string;
}

export interface FeedResponse {
  posts: Post[];
  count: number;
  radius: number;
}

export interface PostDetailResponse {
  post: Post;
  replies: PostReply[];
}
