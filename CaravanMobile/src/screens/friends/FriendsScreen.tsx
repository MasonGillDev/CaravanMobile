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
} from 'react-native';
import { theme } from '../../styles/theme';
import friendService from '../../services/api/friendService';
import { Friend } from '../../types/friend';
import { User } from '../../types/user';
import { useAuth } from '../../context/AuthContext';

/**
 * FriendsScreen - Main screen for managing friends and friend requests
 *
 * Features:
 * - Search for users by username
 * - View accepted friends
 * - View and respond to pending requests (requests sent TO you)
 * - View sent requests (requests sent BY you)
 * - Send new friend requests by username
 * - Remove friends
 */

type TabType = 'friends' | 'pending' | 'sent';

export const FriendsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  /**
   * Load data based on active tab
   */
  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      if (activeTab === 'friends') {
        const data = await friendService.getFriendsList();
        setFriends(data);
      } else if (activeTab === 'pending') {
        const data = await friendService.getPendingRequests();
        setPendingRequests(data);
      } else if (activeTab === 'sent') {
        const data = await friendService.getSentRequests();
        setSentRequests(data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [activeTab]);

  /**
   * Pull-to-refresh handler
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, [loadData]);

  // Load data when tab changes
  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  /**
   * Search for users by username
   */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await friendService.searchUsers(query.trim());
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  /**
   * Send a friend request by username
   */
  const handleSendRequest = async (username: string) => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setSendingRequest(username);
    try {
      await friendService.sendFriendRequest(username.trim());
      Alert.alert('Success', `Friend request sent to ${username}!`);
      setSearchQuery('');
      setSearchResults([]);
      // Refresh sent requests if on that tab
      if (activeTab === 'sent') {
        await loadData(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(null);
    }
  };

  /**
   * Accept a friend request
   */
  const handleAcceptRequest = async (friendshipId: number) => {
    try {
      await friendService.acceptFriendRequest(friendshipId);
      Alert.alert('Success', 'Friend request accepted!');
      await loadData(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  /**
   * Decline a friend request
   */
  const handleDeclineRequest = async (friendshipId: number) => {
    try {
      await friendService.declineFriendRequest(friendshipId);
      await loadData(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline request');
    }
  };

  /**
   * Remove a friend or cancel a sent request
   */
  const handleRemoveFriend = async (friendshipId: number, isFriend: boolean) => {
    Alert.alert(
      isFriend ? 'Remove Friend' : 'Cancel Request',
      isFriend ? 'Are you sure you want to remove this friend?' : 'Cancel this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isFriend ? 'Remove' : 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.removeFriend(friendshipId);
              await loadData(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  /**
   * Get the display name for a friend
   * Shows the other person in the friendship (not the current user)
   */
  const getFriendDisplayId = (friend: Friend): string => {
    if (friend.requester_id === user?.user_id) {
      return friend.addressee_id;
    }
    return friend.requester_id;
  };

  /**
   * Render a search result item
   */
  const renderSearchResultItem = ({ item }: { item: User }) => {
    const isCurrentUser = item.user_id === user?.user_id;
    const isSending = sendingRequest === item.username;

    return (
      <View style={styles.searchResultItem}>
        <View style={styles.friendInfo}>
          <Text style={styles.friendId}>{item.username}</Text>
          {item.email && (
            <Text style={styles.friendEmail}>{item.email}</Text>
          )}
        </View>
        {isCurrentUser ? (
          <Text style={styles.youLabel}>You</Text>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, isSending && styles.addButtonDisabled]}
            onPress={() => handleSendRequest(item.username!)}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.addButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * Render a friend item (accepted friendship)
   */
  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendId}>{getFriendDisplayId(item)}</Text>
        <Text style={styles.friendSince}>
          Friends since {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFriend(item.friend_id, true)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render a pending request item (requests sent TO current user)
   */
  const renderPendingRequestItem = ({ item }: { item: Friend }) => (
    <View style={styles.requestItem}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendId}>{item.requester_id}</Text>
        <Text style={styles.requestDate}>
          Sent {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.friend_id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item.friend_id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render a sent request item (requests sent BY current user)
   */
  const renderSentRequestItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendId}>{item.addressee_id}</Text>
        <Text style={styles.requestDate}>
          Sent {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleRemoveFriend(item.friend_id, false)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Get current list based on active tab
   */
  const getCurrentList = () => {
    switch (activeTab) {
      case 'friends':
        return friends;
      case 'pending':
        return pendingRequests;
      case 'sent':
        return sentRequests;
    }
  };

  /**
   * Get appropriate render function based on active tab
   */
  const getRenderItem = () => {
    switch (activeTab) {
      case 'friends':
        return renderFriendItem;
      case 'pending':
        return renderPendingRequestItem;
      case 'sent':
        return renderSentRequestItem;
    }
  };

  /**
   * Get empty state message based on active tab
   */
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'friends':
        return 'No friends yet. Search for users to add friends!';
      case 'pending':
        return 'No pending requests';
      case 'sent':
        return 'No sent requests';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by username..."
          placeholderTextColor={theme.colors.gray[400]}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.searchSpinner}
          />
        )}
      </View>

      {/* Search Results */}
      {searchQuery.length >= 2 && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsTitle}>Search Results</Text>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResultItem}
            keyExtractor={(item) => item.user_id}
            style={styles.searchResultsList}
          />
        </View>
      )}

      {/* Show tabs and content only when not searching */}
      {searchQuery.length < 2 && (
        <>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
              onPress={() => setActiveTab('friends')}
            >
              <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
                Friends ({friends.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Pending ({pendingRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
              onPress={() => setActiveTab('sent')}
            >
              <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
                Sent ({sentRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={getCurrentList()}
              renderItem={getRenderItem()}
              keyExtractor={(item) => item.friend_id.toString()}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
                </View>
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
        </>
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
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
  },
  searchSection: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  searchSpinner: {
    marginLeft: theme.spacing.sm,
  },
  searchResultsContainer: {
    maxHeight: 300,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: theme.colors.gray[100],
  },
  searchResultsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  searchResultsList: {
    paddingHorizontal: theme.spacing.lg,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[600],
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120, // Extra space for floating tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray[500],
    textAlign: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  friendInfo: {
    flex: 1,
  },
  friendId: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: 2,
  },
  friendSince: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
  },
  requestDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  acceptButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  declineButton: {
    backgroundColor: theme.colors.gray[300],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  declineButtonText: {
    color: theme.colors.dark,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  removeButton: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  removeButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  cancelButton: {
    backgroundColor: theme.colors.gray[400],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  cancelButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  youLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
  },
});
