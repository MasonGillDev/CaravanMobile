import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import ApiClient from '../../services/api/apiClient';
import { PlaceRecommendation } from '../../services/api/placeService';
import { useAuth } from '../../context/AuthContext';

export const RecommendationsScreen: React.FC = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PlaceRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const apiClient = ApiClient.getInstance();

  const fetchRecommendations = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const response = await apiClient.getPlaceRecommendations(10);
      if (response.success && response.recommendations) {
        setRecommendations(response.recommendations);
      }
    } catch (error: any) {
      console.log('Error fetching recommendations:', error);

      if (
        error.response?.status === 400 ||
        error.response?.data?.message?.includes('survey')
      ) {
        console.log('User needs to complete survey for recommendations');
      } else if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to load recommendations');
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const renderPlaceCard = ({ item }: { item: PlaceRecommendation }) => (
    <TouchableOpacity style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <Text style={styles.placeName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.matchScore}>{Math.round(item.similarity * 100)}% match</Text>
      </View>

      <Text style={styles.placeAddress} numberOfLines={2}>
        {item.address}
      </Text>

      <Text style={styles.placeCity}>
        {item.city}, {item.state}
      </Text>

      <View style={styles.placeDetails}>
        {item.rating && (
          <View style={styles.detailItem}>
            <Ionicons name="star" size={16} color={theme.colors.secondary} />
            <Text style={styles.detailText}>{item.rating}</Text>
          </View>
        )}
        {item.price && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="currency-usd" size={16} color={theme.colors.success} />
            <Text style={styles.detailText}>{item.price}</Text>
          </View>
        )}
        {item.hours && (
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.detailText}>{item.hours}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recommendations</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommendations</Text>
        <Text style={styles.subtitle}>Personalized places for you</Text>
      </View>

      {recommendations.length > 0 ? (
        <FlatList
          data={recommendations}
          renderItem={renderPlaceCard}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Complete your survey to get personalized recommendations
          </Text>
        </View>
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
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120, // Extra space for floating tab bar
  },
  placeCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  placeName: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
    marginRight: theme.spacing.sm,
  },
  matchScore: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  placeAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.xs,
  },
  placeCity: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    marginBottom: theme.spacing.md,
  },
  placeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontWeight: theme.fontWeight.medium,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
  },
});
