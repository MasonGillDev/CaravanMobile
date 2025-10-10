import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { config } from '../../utils/config';

WebBrowser.maybeCompleteAuthSession();

export class Auth0Service {
  private static instance: Auth0Service;

  private constructor() {}

  static getInstance(): Auth0Service {
    if (!Auth0Service.instance) {
      Auth0Service.instance = new Auth0Service();
    }
    return Auth0Service.instance;
  }

  createAuthRequest(discovery: any) {
    const redirectUri = config.auth0.redirectUri;

    const request = new AuthSession.AuthRequest({
      clientId: config.auth0.clientId,
      scopes: config.auth0.scope.split(' '),
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      extraParams: {
        audience: config.auth0.audience,
      },
    });

    return { request, discovery };
  }

  async saveTokens(tokens: any) {
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    if (tokens.idToken) {
      await SecureStore.setItemAsync('idToken', tokens.idToken);
    }
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    }
  }

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('accessToken');
  }

  async clearTokens() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('idToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  async logout() {
    await this.clearTokens();
    const redirectUri = config.auth0.redirectUri;
    
    const logoutUrl = `https://${config.auth0.domain}/v2/logout?client_id=${config.auth0.clientId}&returnTo=${encodeURIComponent(redirectUri)}`;
    await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
  }
}