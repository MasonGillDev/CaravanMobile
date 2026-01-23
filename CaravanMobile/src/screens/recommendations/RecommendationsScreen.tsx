import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import ApiClient from '../../services/api/apiClient';
import { PlaceRecommendation } from '../../services/api/placeService';
import LocationService from '../../services/location/locationService';
import { theme } from '../../styles/theme';

interface Concert {
  concert_id: string;
  name: string;
  url: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  venue_city?: string;
  venue_state?: string;
  genre?: string;
  price_min?: number;
  price_max?: number;
  similarity?: number;
}

export const RecommendationsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [recommendations, setRecommendations] = useState<PlaceRecommendation[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const apiClient = ApiClient.getInstance();
  const locationService = LocationService.getInstance();

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

  const fetchConcerts = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      if (!location) {
        console.log('No location available for fetching concerts');
        return;
      }

      // First, trigger fetching concerts from Ticketmaster to our backend
      try {
        await apiClient.fetchConcerts(location.latitude, location.longitude, 25);
      } catch (error) {
        console.log('Note: Failed to fetch new concerts, will use existing:', error);
        // Continue to get recommendations even if fetch fails
      }

      // Then get personalized recommendations
      const response = await apiClient.getConcertRecommendations(10);
      if (response.success && response.recommendations) {
        setConcerts(response.recommendations);
      }
    } catch (error) {
      console.log('Error getting concert recommendations:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRecommendations(false), fetchConcerts()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      fetchRecommendations();
      fetchConcerts();
    }
  }, [user]);

  const handlePlacePress = (place: PlaceRecommendation) => {
    // Navigate to Home tab (map) with the selected place
    navigation.navigate('Home' as never, { selectedPlace: place } as never);
  };

  const renderPlaceCard = ({ item }: { item: PlaceRecommendation }) => (
    <TouchableOpacity style={styles.placeCard} onPress={() => handlePlacePress(item)}>
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
        <ScreenHeader title="Discover" subtitle="Personalized places for you" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderListHeader = () => {
    if (concerts.length === 0) return null;

    return (
      <View style={styles.concertsSection}>
        <Text style={styles.sectionTitle}>Concerts For You</Text>
        {concerts.slice(0, 5).map((concert) => (
          <View key={concert.concert_id} style={styles.concertItem}>
            <Text style={styles.concertName}>{concert.name}</Text>
            {concert.venue_name && (
              <Text style={styles.concertVenue}>{concert.venue_name}</Text>
            )}
            <Text style={styles.concertDate}>{concert.event_date}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Discover" />

      {recommendations.length > 0 ? (
        <FlatList
          data={recommendations}
          renderItem={renderPlaceCard}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
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
    color: theme.colors.secondary,
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
  concertsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  concertItem: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  concertName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  concertVenue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginBottom: 4,
  },
  concertDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
  },
});
