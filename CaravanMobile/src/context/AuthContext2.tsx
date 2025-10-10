import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Auth0Service } from '../services/auth/auth0Service';
import ApiClient from '../services/api/apiClient';
import { AuthState } from '../types/user';
import { config } from '../utils/config';
import { Platform } from 'react-native';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const auth0Service = Auth0Service.getInstance();
  const apiClient = ApiClient.getInstance();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (accessToken) {
        // Verify token and get user
        const userResponse = await apiClient.getUserProfile();
        setAuthState({
          user: userResponse.user,
          tokens: { accessToken, expiresIn: 0 },
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          tokens: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const handleTokens = async (accessToken: string, idToken: string | null) => {
    try {
      // Save tokens
      await SecureStore.setItemAsync('accessToken', accessToken);
      if (idToken) {
        await SecureStore.setItemAsync('idToken', idToken);
      }

      // Get user profile from API
      const userResponse = await apiClient.getUserProfile();
      
      setAuthState({
        user: userResponse.user,
        tokens: {
          accessToken,
          idToken: idToken || undefined,
          expiresIn: 3600,
        },
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Failed to handle tokens:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Build Auth0 URL manually
      const authUrl = `https://${config.auth0.domain}/authorize?` + 
        `response_type=token&` +
        `client_id=${config.auth0.clientId}&` +
        `redirect_uri=${encodeURIComponent(config.auth0.redirectUri)}&` +
        `scope=${encodeURIComponent(config.auth0.scope)}&` +
        `audience=${encodeURIComponent(config.auth0.audience)}`;

      console.log('Opening Auth URL:', authUrl);

      // For Expo Go, we need to handle this differently
      // Open the URL in the system browser
      const canOpen = await Linking.canOpenURL(authUrl);
      if (canOpen) {
        await Linking.openURL(authUrl);
        
        // Listen for the redirect back
        const handleRedirect = (url: string) => {
          console.log('Received redirect:', url);
          // Handle the redirect URL here
          if (url.includes('auth.expo.io')) {
            // Parse tokens from URL
            const urlParts = url.split('#');
            if (urlParts.length > 1) {
              const params = new URLSearchParams(urlParts[1]);
              const accessToken = params.get('access_token');
              const idToken = params.get('id_token');
              
              if (accessToken) {
                handleTokens(accessToken, idToken);
              }
            }
          }
        };
        
        // Add listener for URL
        const subscription = Linking.addEventListener('url', (event) => {
          handleRedirect(event.url);
        });
        
        // Clean up listener after timeout
        setTimeout(() => {
          subscription.remove();
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }, 60000); // 1 minute timeout
        
        return;
      }

      // Fallback to WebBrowser if Linking doesn't work
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        config.auth0.redirectUri
      );

      console.log('Auth result:', result);

      if (result.type === 'success' && result.url) {
        // Parse the URL to get tokens
        const urlParts = result.url.split('#');
        if (urlParts.length > 1) {
          const params = new URLSearchParams(urlParts[1]);
          const accessToken = params.get('access_token');
          const idToken = params.get('id_token');

          if (accessToken) {
            // Use the handleTokens function
            await handleTokens(accessToken, idToken);
          } else {
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      await auth0Service.logout();
      
      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refreshUser = async () => {
    try {
      const userResponse = await apiClient.getUserProfile();
      setAuthState(prev => ({
        ...prev,
        user: userResponse.user,
      }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};