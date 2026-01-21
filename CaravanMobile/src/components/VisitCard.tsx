import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Visit } from '../types/visit';
import ApiClient from '../services/api/apiClient';

interface VisitCardProps {
  visit: Visit;
  onRatingSubmitted?: (sessionId: string, rating: number) => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({ visit, onRatingSubmitted }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [currentRating, setCurrentRating] = useState(visit.user_rating || 0);
  const apiClient = ApiClient.getInstance();

  const arrivalDate = new Date(visit.arrival_time);
  const dwellTime = visit.dwell_minutes ? `${visit.dwell_minutes} min` : 'N/A';

  const handleRatingPress = async (rating: number) => {
    setSubmittingRating(true);
    try {
      await apiClient.submitRating({
        session_id: visit.session_id,
        place_id: visit.place_id,
        rating,
      });

      setCurrentRating(rating);
      if (onRatingSubmitted) {
        onRatingSubmitted(visit.session_id, rating);
      }

      // Collapse after successful rating
      setTimeout(() => setIsExpanded(false), 500);
    } catch (error: any) {
      console.error('Failed to submit rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRatingPress(i)}
          disabled={submittingRating}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= currentRating ? 'star' : 'star-outline'}
            size={32}
            color={i <= currentRating ? theme.colors.secondary : theme.colors.gray[400]}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.visitItem}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.visitHeader}>
          <MaterialCommunityIcons
            name="map-marker"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.visitPlaceName} numberOfLines={1}>
            {visit.place_name}
          </Text>
          {currentRating > 0 && !isExpanded && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={theme.colors.white} />
              <Text style={styles.ratingBadgeText}>{currentRating}</Text>
            </View>
          )}
        </View>

        <Text style={styles.visitAddress} numberOfLines={1}>
          {visit.place_address}
        </Text>

        <View style={styles.visitDetails}>
          <View style={styles.visitDetailItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.gray[500]} />
            <Text style={styles.visitDetailText}>
              {arrivalDate.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.visitDetailItem}>
            <Ionicons name="time-outline" size={14} color={theme.colors.gray[500]} />
            <Text style={styles.visitDetailText}>{dwellTime}</Text>
          </View>
          {visit.place_rating && (
            <View style={styles.visitDetailItem}>
              <Ionicons name="star" size={14} color={theme.colors.secondary} />
              <Text style={styles.visitDetailText}>{visit.place_rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Rating Button */}
        {!isExpanded && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => setIsExpanded(true)}
          >
            <Ionicons
              name={currentRating > 0 ? 'create-outline' : 'star-outline'}
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.rateButtonText}>
              {currentRating > 0 ? 'Change Rating' : 'Rate Visit'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Expanded Rating Section */}
      {isExpanded && (
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>How was your visit?</Text>
          <View style={styles.starsContainer}>
            {submittingRating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              renderStars()
            )}
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsExpanded(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  visitItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  visitPlaceName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    gap: 2,
  },
  ratingBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  visitAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.sm,
  },
  visitDetails: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
  },
  visitDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitDetailText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[100],
  },
  rateButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  ratingSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  ratingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  starButton: {
    padding: theme.spacing.xs,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontWeight: theme.fontWeight.medium,
  },
});
