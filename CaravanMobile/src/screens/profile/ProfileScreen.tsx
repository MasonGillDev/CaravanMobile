import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import ApiClient from '../../services/api/apiClient';
import { Visit } from '../../types/visit';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const apiClient = ApiClient.getInstance();

  useEffect(() => {
    if (user) {
      fetchVisits();
    }
  }, [user]);

  const fetchVisits = async () => {
    setLoadingVisits(true);
    try {
      const response = await apiClient.getUserVisits();
      if (response.success) {
        setVisits(response.visits || []);
      }
    } catch (error: any) {
      console.log('Failed to fetch visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleRetakeSurvey = () => {
    navigation.navigate('Survey' as never);
  };

  const renderVisitItem = ({ item }: { item: Visit }) => {
    const arrivalDate = new Date(item.arrival_time);
    const dwellTime = item.dwell_minutes ? `${item.dwell_minutes} min` : 'N/A';

    return (
      <View style={styles.visitItem}>
        <View style={styles.visitHeader}>
          <MaterialCommunityIcons
            name="map-marker"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.visitPlaceName} numberOfLines={1}>
            {item.place_name}
          </Text>
        </View>
        <Text style={styles.visitAddress} numberOfLines={1}>
          {item.place_address}
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
          {item.place_rating && (
            <View style={styles.visitDetailItem}>
              <Ionicons name="star" size={14} color={theme.colors.secondary} />
              <Text style={styles.visitDetailText}>{item.place_rating}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{user?.username || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Country</Text>
            <Text style={styles.value}>{user?.country_code || 'Not set'}</Text>
          </View>

          {user?.dob && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>
                {new Date(user.dob).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Profile Status</Text>
            <View style={[
              styles.badge,
              user?.profile_completed ? styles.badgeComplete : styles.badgeIncomplete
            ]}>
              <Text style={styles.badgeText}>
                {user?.profile_completed ? 'Complete' : 'Incomplete'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Survey Status</Text>
            <View style={[
              styles.badge,
              user?.survey_completed ? styles.badgeComplete : styles.badgeIncomplete
            ]}>
              <Text style={styles.badgeText}>
                {user?.survey_completed ? 'Complete' : 'Incomplete'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRetakeSurvey}
          >
            <View style={styles.actionButtonContent}>
              <MaterialCommunityIcons
                name={user?.survey_completed ? "refresh" : "clipboard-text"}
                size={20}
                color={theme.colors.white}
              />
              <Text style={styles.actionButtonText}>
                {user?.survey_completed ? 'Retake Survey' : 'Complete Survey'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Visits History Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Visits</Text>
          {loadingVisits ? (
            <View style={styles.visitsLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.visitsLoadingText}>Loading visits...</Text>
            </View>
          ) : visits.length > 0 ? (
            <FlatList
              data={visits}
              renderItem={renderVisitItem}
              keyExtractor={(item) => item.session_id}
              scrollEnabled={false}
              ListFooterComponent={
                visits.length > 5 ? (
                  <Text style={styles.showingText}>Showing recent 50 visits</Text>
                ) : null
              }
            />
          ) : (
            <Text style={styles.noVisitsText}>
              No visits yet. Start exploring places to see your history here!
            </Text>
          )}
        </View>

        {/* Logout Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Account Details */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>User ID: {user?.user_id}</Text>
          <Text style={styles.footerText}>
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120, // Extra space for floating tab bar
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
  },
  value: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontWeight: theme.fontWeight.semibold,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  badgeComplete: {
    backgroundColor: theme.colors.success + '20',
  },
  badgeIncomplete: {
    backgroundColor: theme.colors.gray[300],
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  logoutButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  footer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginBottom: theme.spacing.xs,
  },
  visitsLoadingContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  visitsLoadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
  },
  visitItem: {
    paddingVertical: theme.spacing.md,
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
  visitAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.sm,
  },
  visitDetails: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
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
  noVisitsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
    lineHeight: 20,
  },
  showingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[400],
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },
});
