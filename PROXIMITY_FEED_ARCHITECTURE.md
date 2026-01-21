# Proximity-Based Social Feed Architecture

## Overview

A Twitter-like social feed with geospatial filtering - users see posts from people nearby based on where the post was created. Think "local timeline" meets "social discovery."

---

## Core Concept

**Users post text, images, videos → Posts are geo-tagged with creation location → Feed shows posts within X radius of your current location**

### Key Features
1. **Location-based filtering** - Only show posts from nearby users
2. **Twitter-like feed** - Infinite scroll, real-time updates, interactions
3. **Media support** - Text, images, videos
4. **Social interactions** - Like, comment, share
5. **Privacy controls** - Choose who can see your posts
6. **Discovery** - Explore what's happening nearby

---

## Database Schema

### New Tables Required

#### posts
```sql
CREATE TABLE posts (
    post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of media URLs (images/videos)
    media_type VARCHAR(20) CHECK (media_type IN ('text', 'image', 'video', 'mixed')),

    -- Location data (where post was created)
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS geography for accurate distance
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    location_accuracy DECIMAL(8, 2), -- meters

    -- Optional place association
    place_id UUID REFERENCES places(place_id) ON DELETE SET NULL,
    place_name VARCHAR(255),

    -- Optional visit association
    related_visit_id UUID REFERENCES visit_sessions(session_id) ON DELETE SET NULL,

    -- Privacy & visibility
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'friends_only', 'private')),

    -- Metadata
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    view_count INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete

    -- Indices for performance
    CONSTRAINT posts_content_length CHECK (length(content) <= 500) -- Like Twitter's character limit
);

-- Critical spatial index for distance queries
CREATE INDEX idx_posts_location ON posts USING GIST(location);

-- Other indices
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_place ON posts(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
```

#### likes
```sql
CREATE TABLE likes (
    like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate likes
    CONSTRAINT unique_user_post_like UNIQUE(post_id, user_id)
);

CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_created ON likes(created_at DESC);
```

#### comments
```sql
CREATE TABLE comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,

    -- Threading support (for nested replies)
    parent_comment_id UUID REFERENCES comments(comment_id) ON DELETE CASCADE,
    reply_depth INT DEFAULT 0 CHECK (reply_depth <= 3), -- Max 3 levels deep

    -- Metadata
    like_count INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT comments_content_length CHECK (length(content) <= 300)
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at ASC);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
```

#### comment_likes
```sql
CREATE TABLE comment_likes (
    like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_comment_like UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);
```

#### media_uploads
```sql
CREATE TABLE media_uploads (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(post_id) ON DELETE CASCADE,

    -- Media details
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL, -- bytes
    mime_type VARCHAR(100) NOT NULL,

    -- Storage
    storage_url TEXT NOT NULL, -- Full URL to cloud storage (S3, GCS, etc.)
    thumbnail_url TEXT, -- For videos

    -- Metadata
    width INT,
    height INT,
    duration_seconds INT, -- For videos

    -- Status
    upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'complete', 'failed')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_post ON media_uploads(post_id);
CREATE INDEX idx_media_user ON media_uploads(user_id);
```

---

## API Endpoints

### Feed Endpoints

#### GET /api/feed/nearby
Get proximity-based feed of posts near current location.

**Query Parameters:**
```typescript
{
  lat: number;          // Current latitude
  lng: number;          // Current longitude
  radius: number;       // Radius in meters (default: 5000, max: 50000)
  limit: number;        // Posts per page (default: 20, max: 50)
  offset: number;       // Pagination offset (default: 0)
  visibility?: string;  // Filter by visibility ('public', 'friends_only')
  sort?: string;        // 'recent' | 'popular' (default: 'recent')
}
```

**SQL Query (Core Logic):**
```sql
-- Get posts within radius, ordered by recency
SELECT
    p.*,
    u.username,
    u.profile_image_url,
    ST_Distance(
        p.location::geography,
        ST_MakePoint($2, $1)::geography
    ) as distance_meters,
    EXISTS(
        SELECT 1 FROM likes
        WHERE likes.post_id = p.post_id
        AND likes.user_id = $3
    ) as user_has_liked
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
WHERE
    -- Distance filter using spatial index
    ST_DWithin(
        p.location::geography,
        ST_MakePoint($2, $1)::geography,
        $4  -- radius in meters
    )
    -- Visibility filter
    AND (
        p.visibility = 'public'
        OR (p.visibility = 'friends_only' AND EXISTS(
            SELECT 1 FROM friends
            WHERE (requester_id = $3 AND addressee_id = p.user_id)
               OR (addressee_id = $3 AND requester_id = p.user_id)
            AND status = 'accepted'
        ))
    )
    -- Not deleted
    AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT $5 OFFSET $6;
```

**Response:**
```typescript
{
  success: boolean;
  posts: Post[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}
```

#### GET /api/feed/friends
Get posts from friends only (no location filter).

**Query Parameters:**
```typescript
{
  limit: number;
  offset: number;
}
```

#### GET /api/feed/place/:placeId
Get posts associated with a specific place.

**Query Parameters:**
```typescript
{
  limit: number;
  offset: number;
}
```

---

### Post Management Endpoints

#### POST /api/posts
Create a new post.

**Request Body:**
```typescript
{
  content: string;              // Required, max 500 chars
  media_ids?: string[];         // Optional media upload IDs
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  place_id?: string;            // Optional place association
  related_visit_id?: string;    // Optional visit association
  visibility: 'public' | 'friends_only' | 'private';
}
```

**Response:**
```typescript
{
  success: boolean;
  post: Post;
}
```

#### GET /api/posts/:postId
Get single post details.

**Response:**
```typescript
{
  success: boolean;
  post: Post & {
    user: User;
    likes: number;
    comments: number;
    user_has_liked: boolean;
  };
}
```

#### PUT /api/posts/:postId
Update post (only content, within 5 minutes of creation).

**Request Body:**
```typescript
{
  content: string;
}
```

#### DELETE /api/posts/:postId
Soft delete a post (sets deleted_at).

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### GET /api/users/:userId/posts
Get posts by specific user.

**Query Parameters:**
```typescript
{
  limit: number;
  offset: number;
}
```

---

### Interaction Endpoints

#### POST /api/posts/:postId/like
Like a post.

**Response:**
```typescript
{
  success: boolean;
  like_count: number;
}
```

#### DELETE /api/posts/:postId/like
Unlike a post.

**Response:**
```typescript
{
  success: boolean;
  like_count: number;
}
```

#### GET /api/posts/:postId/likes
Get users who liked a post.

**Query Parameters:**
```typescript
{
  limit: number;
  offset: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  likes: Array<{
    user_id: string;
    username: string;
    profile_image_url?: string;
    created_at: timestamp;
  }>;
}
```

---

### Comment Endpoints

#### POST /api/posts/:postId/comments
Add comment to post.

**Request Body:**
```typescript
{
  content: string;                  // Max 300 chars
  parent_comment_id?: string;       // For replies
}
```

**Response:**
```typescript
{
  success: boolean;
  comment: Comment;
}
```

#### GET /api/posts/:postId/comments
Get comments for a post.

**Query Parameters:**
```typescript
{
  limit: number;
  offset: number;
  sort?: 'recent' | 'popular';
}
```

**Response:**
```typescript
{
  success: boolean;
  comments: Comment[];
}
```

#### PUT /api/comments/:commentId
Edit comment.

#### DELETE /api/comments/:commentId
Delete comment (soft delete).

#### POST /api/comments/:commentId/like
Like a comment.

#### DELETE /api/comments/:commentId/like
Unlike a comment.

---

### Media Endpoints

#### POST /api/media/upload
Upload media file (image or video).

**Request:**
- `Content-Type: multipart/form-data`
- Field: `file` (the media file)
- Max size: 10MB for images, 50MB for videos

**Response:**
```typescript
{
  success: boolean;
  media: {
    media_id: string;
    media_type: 'image' | 'video';
    storage_url: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
  };
}
```

**Process:**
1. Validate file type/size
2. Upload to cloud storage (S3/GCS)
3. Generate thumbnail (for videos)
4. Compress/optimize images
5. Return media_id for use in post creation

#### DELETE /api/media/:mediaId
Delete uploaded media (if not yet associated with a post).

---

## Mobile App Implementation

### New Screens

#### FeedScreen (`/src/screens/feed/FeedScreen.tsx`)
Main proximity feed view.

**Features:**
- Infinite scroll with `FlatList`
- Pull-to-refresh
- Filter toggle: Nearby / Friends / Explore
- Radius selector: 1km / 5km / 10km / 25km
- Real-time updates (optional with WebSocket)

**Layout:**
```
┌─────────────────────────────┐
│  [Nearby ▼] [1km ▼]  🔍    │ <- Filter bar
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ @username • 2m ago      │ │
│ │ 📍 The Coffee Shop      │ │
│ │                         │ │
│ │ Just had the best latte!│ │
│ │ [image]                 │ │
│ │                         │ │
│ │ ❤️ 12  💬 3  📍 0.3km   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ @friend • 15m ago       │ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

#### CreatePostScreen (`/src/screens/feed/CreatePostScreen.tsx`)
Post creation interface.

**Features:**
- Text input (500 char limit with counter)
- Media picker (image/video)
- Current location display
- Optional place tagging
- Visibility selector
- Preview before posting

**Layout:**
```
┌─────────────────────────────┐
│  [Cancel]  New Post  [Post] │
├─────────────────────────────┤
│ What's happening nearby?    │
│                             │
│ [Text input area]           │
│                             │
│                             │
│ [📷 Photo] [🎥 Video]       │
│                             │
│ 📍 Downtown • 0.2km         │
│ 🔒 Visible to: Public ▼     │
│                             │
│ Characters: 245/500         │
└─────────────────────────────┘
```

#### PostDetailScreen (`/src/screens/feed/PostDetailScreen.tsx`)
Individual post view with comments.

**Features:**
- Full post display
- Comment thread
- Like/unlike
- Share options
- Report/block options

### New Components

#### PostCard (`/src/components/PostCard.tsx`)
Reusable post display component.

**Props:**
```typescript
interface PostCardProps {
  post: Post & {
    user: User;
    distance_meters: number;
    user_has_liked: boolean;
  };
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onPress: (postId: string) => void;
}
```

**Features:**
- User avatar & username
- Timestamp (relative: "2m ago")
- Distance indicator ("0.3km away")
- Place tag (if associated)
- Media display (image carousel, video player)
- Like/comment counts
- Interactive buttons

#### CommentThread (`/src/components/CommentThread.tsx`)
Nested comment display.

**Features:**
- Threaded replies (up to 3 levels)
- Like comments
- Reply to comments
- Load more comments pagination

#### MediaPicker (`/src/components/MediaPicker.tsx`)
Image/video selection component.

**Features:**
- Image gallery access
- Camera access
- Video recording
- Multiple selection
- Preview selected media
- Compression options

### New Services

#### postService.ts (`/src/services/api/postService.ts`)
Post API client.

```typescript
class PostService {
  async createPost(data: CreatePostRequest): Promise<Post>;
  async getNearbyFeed(location: Location, radius: number, options: FeedOptions): Promise<FeedResponse>;
  async getFriendsFeed(options: FeedOptions): Promise<FeedResponse>;
  async getPlaceFeed(placeId: string, options: FeedOptions): Promise<FeedResponse>;
  async getPost(postId: string): Promise<Post>;
  async updatePost(postId: string, content: string): Promise<Post>;
  async deletePost(postId: string): Promise<void>;
  async likePost(postId: string): Promise<void>;
  async unlikePost(postId: string): Promise<void>;
  async getPostLikes(postId: string): Promise<Like[]>;
}
```

#### commentService.ts (`/src/services/api/commentService.ts`)
Comment API client.

```typescript
class CommentService {
  async addComment(postId: string, content: string, parentId?: string): Promise<Comment>;
  async getComments(postId: string, options: PaginationOptions): Promise<Comment[]>;
  async updateComment(commentId: string, content: string): Promise<Comment>;
  async deleteComment(commentId: string): Promise<void>;
  async likeComment(commentId: string): Promise<void>;
  async unlikeComment(commentId: string): Promise<void>;
}
```

#### mediaService.ts (`/src/services/api/mediaService.ts`)
Media upload client.

```typescript
class MediaService {
  async uploadImage(uri: string, options?: UploadOptions): Promise<MediaUpload>;
  async uploadVideo(uri: string, options?: UploadOptions): Promise<MediaUpload>;
  async deleteMedia(mediaId: string): Promise<void>;
  async compressImage(uri: string): Promise<string>;
}
```

### New Types

#### `/src/types/post.ts`
```typescript
export interface Post {
  post_id: string;
  user_id: string;
  content: string;
  media_urls?: string[];
  media_type?: 'text' | 'image' | 'video' | 'mixed';
  location_lat: number;
  location_lng: number;
  location_accuracy?: number;
  place_id?: string;
  place_name?: string;
  related_visit_id?: string;
  visibility: 'public' | 'friends_only' | 'private';
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostWithUser extends Post {
  user: {
    user_id: string;
    username: string;
    profile_image_url?: string;
  };
  distance_meters?: number;
  user_has_liked: boolean;
}

export interface CreatePostRequest {
  content: string;
  media_ids?: string[];
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  place_id?: string;
  related_visit_id?: string;
  visibility: 'public' | 'friends_only' | 'private';
}

export interface FeedResponse {
  success: boolean;
  posts: PostWithUser[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}
```

#### `/src/types/comment.ts`
```typescript
export interface Comment {
  comment_id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  reply_depth: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    profile_image_url?: string;
  };
  replies?: Comment[];
}
```

---

## Backend Implementation (Go)

### New Handlers

#### `handlers/post_handler.go`
```go
type PostHandler struct {
    postRepo    *repositories.PostRepository
    userRepo    *repositories.UserRepository
    friendRepo  *repositories.FriendRepository
}

func (h *PostHandler) CreatePost(c *gin.Context)
func (h *PostHandler) GetNearbyFeed(c *gin.Context)
func (h *PostHandler) GetFriendsFeed(c *gin.Context)
func (h *PostHandler) GetPost(c *gin.Context)
func (h *PostHandler) UpdatePost(c *gin.Context)
func (h *PostHandler) DeletePost(c *gin.Context)
func (h *PostHandler) LikePost(c *gin.Context)
func (h *PostHandler) UnlikePost(c *gin.Context)
func (h *PostHandler) GetPostLikes(c *gin.Context)
```

#### `handlers/comment_handler.go`
```go
type CommentHandler struct {
    commentRepo *repositories.CommentRepository
}

func (h *CommentHandler) AddComment(c *gin.Context)
func (h *CommentHandler) GetComments(c *gin.Context)
func (h *CommentHandler) UpdateComment(c *gin.Context)
func (h *CommentHandler) DeleteComment(c *gin.Context)
func (h *CommentHandler) LikeComment(c *gin.Context)
func (h *CommentHandler) UnlikeComment(c *gin.Context)
```

#### `handlers/media_handler.go`
```go
type MediaHandler struct {
    mediaRepo      *repositories.MediaRepository
    storageService *services.StorageService
}

func (h *MediaHandler) UploadMedia(c *gin.Context)
func (h *MediaHandler) DeleteMedia(c *gin.Context)
```

### New Repositories

#### `repositories/post_repository.go`
```go
type PostRepository struct {
    db *sql.DB
}

func (r *PostRepository) Create(post *models.Post) error
func (r *PostRepository) GetByID(postID string) (*models.Post, error)
func (r *PostRepository) GetNearbyPosts(lat, lng, radius float64, limit, offset int, userID string) ([]*models.PostWithUser, error)
func (r *PostRepository) GetFriendsPosts(userID string, limit, offset int) ([]*models.PostWithUser, error)
func (r *PostRepository) GetByPlace(placeID string, limit, offset int) ([]*models.PostWithUser, error)
func (r *PostRepository) GetByUser(userID string, limit, offset int) ([]*models.Post, error)
func (r *PostRepository) Update(postID string, content string) error
func (r *PostRepository) Delete(postID string) error
func (r *PostRepository) IncrementLikeCount(postID string) error
func (r *PostRepository) DecrementLikeCount(postID string) error
func (r *PostRepository) IncrementCommentCount(postID string) error
func (r *PostRepository) DecrementCommentCount(postID string) error
```

#### `repositories/like_repository.go`
```go
type LikeRepository struct {
    db *sql.DB
}

func (r *LikeRepository) Create(postID, userID string) error
func (r *LikeRepository) Delete(postID, userID string) error
func (r *LikeRepository) GetByPost(postID string, limit, offset int) ([]*models.Like, error)
func (r *LikeRepository) UserHasLiked(postID, userID string) (bool, error)
```

#### `repositories/comment_repository.go`
```go
type CommentRepository struct {
    db *sql.DB
}

func (r *CommentRepository) Create(comment *models.Comment) error
func (r *CommentRepository) GetByPost(postID string, limit, offset int) ([]*models.Comment, error)
func (r *CommentRepository) GetReplies(commentID string) ([]*models.Comment, error)
func (r *CommentRepository) Update(commentID, content string) error
func (r *CommentRepository) Delete(commentID string) error
```

### New Services

#### `services/storage_service.go`
Cloud storage integration (S3/GCS).

```go
type StorageService struct {
    client     *s3.Client
    bucketName string
}

func (s *StorageService) UploadFile(file multipart.File, filename string) (string, error)
func (s *StorageService) DeleteFile(url string) error
func (s *StorageService) GenerateThumbnail(videoURL string) (string, error)
```

#### `services/feed_service.go`
Feed algorithm and caching.

```go
type FeedService struct {
    postRepo  *repositories.PostRepository
    cache     *redis.Client
}

func (s *FeedService) GetNearbyFeed(userID string, location Location, radius float64, options FeedOptions) (*FeedResponse, error)
func (s *FeedService) GetPersonalizedFeed(userID string, options FeedOptions) (*FeedResponse, error)
func (s *FeedService) InvalidateCache(userID string) error
```

---

## Performance Considerations

### Spatial Query Optimization

**Problem:** PostGIS spatial queries can be slow with many posts.

**Solutions:**
1. **Spatial Index (GIST)**: Already included in schema
2. **Bounding Box Pre-filter**:
   ```sql
   -- Fast bounding box check before precise distance calc
   WHERE location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
   ```
3. **Limit Search Area**: Cap max radius at 50km
4. **Partition by Geography**: Partition posts table by region if scaling globally

### Feed Caching

**Redis Cache Strategy:**
```
Key: feed:nearby:{user_id}:{lat}:{lng}:{radius}
TTL: 5 minutes
Value: Serialized feed response
```

**Invalidation:**
- When user creates new post
- When user location changes significantly
- Time-based expiration (5 min)

### Pagination Strategy

**Cursor-based pagination** (better than offset for large datasets):
```typescript
// Instead of offset
cursor?: string; // encoded: {timestamp}_{post_id}

// SQL
WHERE created_at < $cursor_timestamp
   OR (created_at = $cursor_timestamp AND post_id < $cursor_id)
```

### Database Indices

All critical indices included in schema above. Monitor slow query log and add as needed.

---

## Privacy & Security

### Post Visibility Rules

1. **Public**: Anyone can see (default)
2. **Friends Only**: Only accepted friends can see
3. **Private**: Only user can see (drafts)

### Location Privacy

**Options for users:**
- Exact location (precise GPS)
- Approximate location (rounded to 100m)
- City level only
- No location (can't post to proximity feed)

### Content Moderation

**Required features:**
- Report post (harassment, spam, inappropriate)
- Block user (hide all their content)
- Admin review queue
- Automated content filtering (profanity, banned words)

### Rate Limiting

```
POST /api/posts: 10 per hour per user
POST /api/comments: 30 per hour per user
POST /api/posts/:id/like: 100 per hour per user
POST /api/media/upload: 5 per hour per user
```

---

## Analytics & Monitoring

### Metrics to Track

1. **Post Metrics**:
   - Posts per day/hour
   - Average likes per post
   - Average comments per post
   - Media upload success rate

2. **Feed Metrics**:
   - Feed load time
   - Average posts per feed query
   - Cache hit rate
   - User engagement (time spent, scroll depth)

3. **Spatial Metrics**:
   - Average search radius
   - Posts within 1km vs 5km vs 10km
   - Hot zones (areas with most posts)

4. **Performance**:
   - API response times
   - Database query times
   - Media upload times
   - Feed refresh rate

---

## Future Enhancements

### Phase 2 Features

1. **Hashtags**: Tag posts with topics (#coffee #nightlife)
2. **Mentions**: @username tagging
3. **Stories**: Ephemeral 24-hour posts (like Instagram Stories)
4. **Live Posts**: Real-time location broadcasting
5. **Trending**: Hot posts in your area
6. **Notifications**: Push notifications for likes, comments, nearby posts
7. **Bookmarks**: Save posts for later
8. **Reposts**: Share others' posts to your feed

### Advanced Features

1. **Heatmap Overlay**: Visualize post density on map
2. **AR View**: View posts in augmented reality at their location
3. **Event Posts**: Special post type for events happening at places
4. **Check-in Rewards**: Gamification for posting at new places
5. **Group Chats**: Location-based group discussions
6. **Filters**: Photo/video filters before posting

---

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Create database migrations (posts, likes, comments, media)
- [ ] Set up cloud storage (S3/GCS)
- [ ] Implement post creation API
- [ ] Build basic PostCard component
- [ ] Create CreatePostScreen

### Week 3-4: Feed
- [ ] Implement proximity feed query with PostGIS
- [ ] Build FeedScreen with infinite scroll
- [ ] Add feed caching with Redis
- [ ] Implement pull-to-refresh
- [ ] Add filter/sort options

### Week 5-6: Interactions
- [ ] Build like/unlike functionality
- [ ] Create comment system
- [ ] Add PostDetailScreen
- [ ] Implement CommentThread component
- [ ] Add real-time updates (optional)

### Week 7-8: Media & Polish
- [ ] Implement media upload
- [ ] Add image compression
- [ ] Build video thumbnail generation
- [ ] Optimize performance
- [ ] Add analytics
- [ ] Testing & bug fixes

### Week 9-10: Launch Prep
- [ ] Security audit
- [ ] Privacy controls
- [ ] Content moderation tools
- [ ] Rate limiting
- [ ] Load testing
- [ ] Beta testing with users

---

## Key Technical Decisions

### Why PostGIS?
- Already in use (per codebase exploration)
- Accurate distance calculations (haversine formula built-in)
- Efficient spatial indexing (GIST)
- Industry standard for geospatial apps

### Why Not Build Custom Feed Algorithm?
- Start simple: chronological + proximity
- Add personalization later based on user behavior
- Twitter-like reverse chronological is familiar to users

### Why Soft Deletes?
- Preserve data for analytics
- Allow "undo" functionality
- Comply with retention policies
- Easy to permanently delete later

### Why 500 Character Limit?
- Encourages concise, engaging content
- Similar to Twitter (280 chars) but more flexible
- Reduces storage/bandwidth
- Better mobile UX (less scrolling)

---

## Cost Estimates (AWS)

### For 10,000 active users:

**Storage (S3):**
- ~500MB media per user/month
- 10,000 users × 500MB = 5TB
- $115/month

**Database (RDS PostgreSQL with PostGIS):**
- db.t3.medium instance
- ~$80/month

**Redis Cache (ElastiCache):**
- cache.t3.micro
- ~$15/month

**Data Transfer:**
- ~10GB/month
- ~$1/month

**Total: ~$210/month for 10k users**

Scale linearly up to ~100k users, then optimize/shard.

---

## Conclusion

This architecture provides a **Twitter-like social feed with geospatial filtering** that leverages your existing infrastructure (PostGIS, location tracking, friends system) while adding the core components needed for user-generated content.

**Key differentiator**: Unlike Twitter's global timeline or Instagram's follower feed, this is a **proximity-based local discovery feed** - perfect for finding what's happening nearby and connecting with people in your area.

Start with MVP (posts + feed + likes), then iterate based on user feedback!
