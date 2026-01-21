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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import postService from '../../services/api/postService';
import { Post } from '../../types/post';
import { useAuth } from '../../context/AuthContext';
import * as Location from 'expo-location';
import { MentionText } from '../../components/MentionText';

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius] = useState(5); // 5km radius

  /**
   * Get user's current location
   */
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to view the feed');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
      return null;
    }
  };

  /**
   * Load feed posts
   */
  const loadFeed = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const location = await getUserLocation();
      if (!location) {
        if (showLoader) setLoading(false);
        return;
      }

      setUserLocation(location);

      const response = await postService.getFeed(
        location.latitude,
        location.longitude,
        radius,
        20,
        0
      );

      setPosts(response.posts || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load feed');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [radius]);

  /**
   * Pull-to-refresh handler
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed(false);
    setRefreshing(false);
  }, [loadFeed]);

  useEffect(() => {
    loadFeed();
  }, []);

  /**
   * Handle vote on post
   */
  const handleVote = async (postId: string, currentVote: number | null | undefined, voteType: number) => {
    try {
      // If clicking the same vote button, remove the vote
      if (currentVote === voteType) {
        await postService.removeVote(postId);
        // Update local state
        setPosts(prev => prev.map(p =>
          p.post_id === postId
            ? {
                ...p,
                user_vote: undefined,
                vote_score: p.vote_score - voteType
              }
            : p
        ));
      } else {
        // Otherwise, set the new vote
        await postService.voteOnPost(postId, voteType);
        // Update local state
        setPosts(prev => prev.map(p => {
          if (p.post_id === postId) {
            const scoreDiff = currentVote ? (voteType - currentVote) : voteType;
            return {
              ...p,
              user_vote: voteType,
              vote_score: p.vote_score + scoreDiff
            };
          }
          return p;
        }));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    }
  };

  /**
   * Navigate to post detail
   */
  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail' as never, { postId: post.post_id } as never);
  };

  /**
   * Navigate to create post screen
   */
  const handleCreatePost = () => {
    if (!userLocation) {
      Alert.alert('Error', 'Location not available');
      return;
    }
    navigation.navigate('CreatePost' as never, { location: userLocation } as never);
  };

  /**
   * Render a single post item
   */
  const renderPost = ({ item }: { item: Post }) => {
    const isUpvoted = item.user_vote === 1;
    const isDownvoted = item.user_vote === -1;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => handlePostPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.postHeader}>
          <Text style={styles.username}>@{item.username || 'Anonymous'}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <MentionText style={styles.postContent}>{item.content}</MentionText>

        <View style={styles.postFooter}>
          <View style={styles.voteContainer}>
            <TouchableOpacity
              style={[styles.voteButton, isUpvoted && styles.voteButtonActive]}
              onPress={() => handleVote(item.post_id, item.user_vote, 1)}
            >
              <Text style={[styles.voteText, isUpvoted && styles.voteTextActive]}>▲</Text>
            </TouchableOpacity>

            <Text style={styles.voteScore}>{item.vote_score}</Text>

            <TouchableOpacity
              style={[styles.voteButton, isDownvoted && styles.voteButtonActive]}
              onPress={() => handleVote(item.post_id, item.user_vote, -1)}
            >
              <Text style={[styles.voteText, isDownvoted && styles.voteTextActive]}>▼</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => handlePostPress(item)}
          >
            <Text style={styles.replyText}>
              {item.reply_count} {item.reply_count === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <Text style={styles.headerSubtitle}>Posts within {radius}km</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts nearby</Text>
            <Text style={styles.emptySubtext}>
              Be the first to post in your area!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <Text style={styles.createButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  replyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  replyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  createButton: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});
