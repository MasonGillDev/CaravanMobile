import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { PlaceRecommendation } from '../../services/api/placeService';
import { useOpenStatus } from '../../hooks/useOpenStatus';
import { useBusinessLevel } from '../../hooks/useBusinessLevel';

interface PlaceInfoPinProps {
  place: PlaceRecommendation;
  heatmapData: any;
}

/**
 * PlaceInfoPin - Displays a pin with place information on the map
 * Shows place name, open/close status, and busyness level
 */
export const PlaceInfoPin: React.FC<PlaceInfoPinProps> = ({ place, heatmapData }) => {
  const openStatus = useOpenStatus(place.hours);
  const businessInfo = useBusinessLevel(heatmapData, place.lat, place.long);

  return (
    <View style={styles.container}>
      {/* Pin pointer */}
      <View style={styles.pointer} />

      {/* Info card */}
      <View style={styles.card}>
        {/* Place name */}
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>

        {/* Open/Close Status */}
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={openStatus.isOpen ? 'clock-check' : 'clock-alert'}
            size={16}
            color={openStatus.isOpen ? theme.colors.success : theme.colors.danger}
          />
          <Text
            style={[
              styles.statusText,
              { color: openStatus.isOpen ? theme.colors.success : theme.colors.danger },
            ]}
          >
            {openStatus.message || (openStatus.isOpen ? 'Open' : 'Closed')}
          </Text>
        </View>

        {/* Busyness indicator - always show */}
        <View style={styles.businessRow}>
          <View style={[styles.businessDot, { backgroundColor: businessInfo.color }]} />
          <Text style={styles.businessText}>{businessInfo.description}</Text>
          {businessInfo.userCount > 0 && (
            <Text style={styles.userCount}>({businessInfo.userCount} nearby)</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minWidth: 180,
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  pointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.primary,
    marginTop: -2,
  },
  placeName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: 6,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  businessText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
  },
  userCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginLeft: 2,
  },
});
