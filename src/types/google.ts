// ─── Google OAuth types ────────────────────────────────────────────────────

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** The user info returned by Google after consent */
export interface GoogleUserInfo {
  sub: string;          // Google's unique user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale?: string;
}

/** What Google's tokeninfo endpoint returns for backend scope validation */
export interface GoogleTokenInfo {
  azp: string;          // Authorized party (client ID)
  aud: string;          // Audience
  sub: string;          // User's Google ID
  scope: string;        // Space-separated list of granted scopes
  exp: string;          // Expiry (unix timestamp as string)
  expires_in: string;   // Seconds until expiry
  email?: string;
  email_verified?: string;
  access_type?: string;
}