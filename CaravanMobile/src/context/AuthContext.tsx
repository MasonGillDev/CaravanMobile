import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Auth0Service } from '../services/auth/auth0Service';
import ApiClient from '../services/api/apiClient';
import { AuthState } from '../types/user';
import { config } from '../utils/config';

// This MUST be called to handle the redirect
WebBrowser.maybeCompleteAuthSession();

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

  // Auto-discovery for Auth0 endpoints
  const discovery = AuthSession.useAutoDiscovery(`https://${config.auth0.domain}`);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (accessToken) {
        try {
          // Verify token and get user - MUST succeed before marking authenticated
          const userResponse = await apiClient.getUserProfile();
          
          // Only set authenticated AFTER confirming user exists
          setAuthState({
            user: userResponse.user,
            tokens: { accessToken, expiresIn: 0 },
            isLoading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          // Token is invalid or user doesn't exist in database
          console.error('User verification failed, clearing tokens:', error);
          
          // Clear invalid tokens
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('idToken');
          await SecureStore.deleteItemAsync('refreshToken');
          
          setAuthState({
            user: null,
            tokens: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
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

  const login = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const redirectUri = config.auth0.redirectUri;
      console.log('Redirect URI:', redirectUri);
      console.log('Auth0 Domain:', config.auth0.domain);
      console.log('Discovery:', discovery);

      if (!discovery) {
        console.error('Discovery not loaded');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const request = new AuthSession.AuthRequest({
        clientId: config.auth0.clientId,
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
        prompt: AuthSession.Prompt.Login, // Force showing login screen
        extraParams: {
          audience: config.auth0.audience,
        },
      });

      // Build the auth URL for debugging
      const authUrl = await request.makeAuthUrlAsync(discovery);
      console.log('Auth URL:', authUrl);
      
      // Prompt for auth
      const result = await request.promptAsync(discovery);
      console.log('Auth result:', result);
      console.log('Result type:', result.type);
      
      if (result.type === 'success' && 'params' in result) {
        console.log('Result params:', result.params);
        const { access_token, id_token, expires_in } = result.params;
        
        if (access_token) {
          // Save tokens
          await SecureStore.setItemAsync('accessToken', access_token);
          if (id_token) {
            await SecureStore.setItemAsync('idToken', id_token);
          }

          // Get user profile from API
          const userResponse = await apiClient.getUserProfile();
          
          setAuthState({
            user: userResponse.user,
            tokens: {
              accessToken: access_token,
              idToken: id_token,
              expiresIn: parseInt(expires_in || '3600'),
            },
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          console.log('No access token received');
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