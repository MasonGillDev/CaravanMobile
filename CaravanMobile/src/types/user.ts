export interface User {
  user_id: string;
  auth0_sub: string;
  email?: string;
  dob?: string;
  country_code?: string;
  profile_completed?: boolean;
  survey_completed?: boolean;
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}