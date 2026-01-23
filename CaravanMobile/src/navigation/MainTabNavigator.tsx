import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { RecommendationsScreen } from '../screens/recommendations/RecommendationsScreen';
import { FriendsScreen } from '../screens/friends/FriendsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { WagonAnimation } from '../components/animations/WagonAnimation';
import { theme } from '../styles/theme';

const Tab = createBottomTabNavigator();

export const MainTabNavigator: React.FC = () => {
  return (
    <View style={{ flex: 1 }}>
      <WagonAnimation />
      <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray[400],
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          backgroundColor: theme.colors.white,
          borderRadius: 30,
          paddingBottom: 10,
          paddingTop: 10,
          height: 70,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "map-marker-radius" : "map-marker-radius-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "compass" : "compass-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "message-text" : "message-text-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarLabel: 'Friends',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
    </View>
  );
};
