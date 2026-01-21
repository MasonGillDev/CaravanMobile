import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import postService from '../../services/api/postService';
import { Post, PostReply } from '../../types/post';
import { useAuth } from '../../context/AuthContext';
import { MentionText } from '../../components/MentionText';

export const PostDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { postId } = route.params as { postId: string };

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const maxReplyLength = 300;
  const remainingChars = maxReplyLength - replyText.length;

  /**
   * Load post and replies
   */
  const loadPost = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const response = await postService.getPost(postId);
      setPost(response.post);
      setReplies(response.replies || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load post');
      navigation.goBack();
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [postId, navigation]);

  /**
   * Pull-to-refresh handler
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPost(false);
    setRefreshing(false);
  }, [loadPost]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  /**
   * Handle vote on post
   */
  const handleVote = async (voteType: number) => {
    if (!post) return;

    try {
      const currentVote = post.user_vote;

      // If clicking the same vote button, remove the vote
      if (currentVote === voteType) {
        await postService.removeVote(post.post_id);
        setPost({
          ...post,
          user_vote: undefined,
          vote_score: post.vote_score - voteType,
        });
      } else {
        // Otherwise, set the new vote
        await postService.voteOnPost(post.post_id, voteType);
        const scoreDiff = currentVote ? (voteType - currentVote) : voteType;
        setPost({
          ...post,
          user_vote: voteType,
          vote_score: post.vote_score + scoreDiff,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    }
  };

  /**
   * Handle reply submission
   */
  const handleSubmitReply = async () => {
    if (replyText.trim().length === 0) {
      Alert.alert('Error', 'Reply cannot be empty');
      return;
    }

    if (replyText.length > maxReplyLength) {
      Alert.alert('Error', `Reply cannot exceed ${maxReplyLength} characters`);
      return;
    }

    setSubmittingReply(true);
    try {
      const newReply = await postService.createReply(postId, replyText.trim());
      setReplies([...replies, newReply]);
      setReplyText('');

      // Update reply count in post
      if (post) {
        setPost({ ...post, reply_count: post.reply_count + 1 });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  /**
   * Render a single reply
   */
  const renderReply = ({ item }: { item: PostReply }) => (
    <View style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <Text style={styles.replyUsername}>@{item.username || 'Anonymous'}</Text>
        <Text style={styles.replyTimestamp}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <MentionText style={styles.replyContent} mentionColor={theme.colors.primary}>{item.content}</MentionText>
    </View>
  );

  if (loading || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isUpvoted = post.user_vote === 1;
  const isDownvoted = post.user_vote === -1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={replies}
          keyExtractor={(item) => item.reply_id}
          renderItem={renderReply}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View>
              {/* Original Post */}
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Text style={styles.username}>@{post.username || 'Anonymous'}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <MentionText style={styles.postContent} mentionColor={theme.colors.primary}>{post.content}</MentionText>

                <View style={styles.postFooter}>
                  <View style={styles.voteContainer}>
                    <TouchableOpacity
                      style={[styles.voteButton, isUpvoted && styles.voteButtonActive]}
                      onPress={() => handleVote(1)}
                    >
                      <Text style={[styles.voteText, isUpvoted && styles.voteTextActive]}>▲</Text>
                    </TouchableOpacity>

                    <Text style={styles.voteScore}>{post.vote_score}</Text>

                    <TouchableOpacity
                      style={[styles.voteButton, isDownvoted && styles.voteButtonActive]}
                      onPress={() => handleVote(-1)}
                    >
                      <Text style={[styles.voteText, isDownvoted && styles.voteTextActive]}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.replyCount}>
                    {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                  </Text>
                </View>
              </View>

              {/* Replies Header */}
              <View style={styles.repliesHeader}>
                <Text style={styles.repliesHeaderText}>Replies</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No replies yet</Text>
              <Text style={styles.emptySubtext}>Be the first to reply!</Text>
            </View>
          }
        />

        {/* Reply Input */}
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write a reply..."
            placeholderTextColor={theme.colors.textSecondary}
            value={replyText}
            onChangeText={setReplyText}
            maxLength={maxReplyLength}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              replyText.trim().length === 0 && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitReply}
            disabled={submittingReply || replyText.trim().length === 0}
          >
            {submittingReply ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  postContent: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  voteText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  voteTextActive: {
    color: '#fff',
  },
  voteScore: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  replyCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  repliesHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 12,
  },
  repliesHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  replyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  replyTimestamp: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  replyContent: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
