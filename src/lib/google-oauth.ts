import { Context } from "hono";
import { google } from '@/config';
import {
    GoogleTokenInfo,
    GoogleTokenResponse,
    GoogleUserInfo
} from '@/types/google'
import { HttpException } from "@/common/http-exception";
import { StatusCodes } from "http-status-codes";
import logger from "./logger";

export interface IGoogleOAuth {
    buildUrl(state: string): string;
    exchangeToken(code: string): Promise<GoogleTokenResponse>;
    validateTokenScope(accessToken: string): Promise<GoogleTokenInfo>;
    userInfo(accessToken: string): Promise<GoogleUserInfo>;
}

export class GoogleOAuth implements IGoogleOAuth {
    /**
     * 
     * Returns the URL to redirect the user to for Google consent.
     * `prompt=consent` + `access_type=offline` ensures we always get a fresh
     * consent screen and a refresh_token on first login.
     * 
     * @param state 
     * @returns 
     */
    buildUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: google.clientId,
            redirect_uri: google.redirectUri,
            response_type: 'code',
            scope: google.scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent',           // force consent screen every time (first login)
            ...(state ? { state } : {}),
        });

        return `${google.authUrl}?${params.toString()}`;
    }

    /**
     * 
     * Takes the one-time `code` from Google's redirect and exchanges it
     * for access_token, refresh_token, and id_token
     * 
     * @param code 
     */
    async exchangeToken(code: string): Promise<GoogleTokenResponse> {
        const res = await fetch(google.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: google.clientId,
                client_secret: google.clientSecret,
                redirect_uri: google.redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            throw new HttpException({
                errCode: 'OAUTH_GOOGLE_GET_TOKEN',
                statusCode: StatusCodes.BAD_REQUEST,
                messages: [`Google token exchange failed: ${body}`]
            })
        }

        logger.http('[google-auth]', { ...res.json() })
        return res.json()
    }

    /**
     * Validates the access_token on the BACKEND by calling Google's tokeninfo
     * endpoint. This confirms:
     *   - The token is live and not expired
     *   - It was issued for YOUR client_id (prevents token injection)
     *   - All required scopes were granted by the user
     *
     * Throws if any check fails.
     * 
     * @param accessToken 
    */
    async validateTokenScope(accessToken: string): Promise<GoogleTokenInfo> {
        const res = await fetch(
            `${google.tokenInfoUrl}?access_token=${encodeURIComponent(accessToken)}`,
        );

        if (!res.ok) throw new HttpException({
            errCode: 'OAUTH_GOOGLE_VALIDATE_TOKEN',
            statusCode: StatusCodes.BAD_GATEWAY,
            messages: ['Google tokeninfo validation failed — token may be invalid or expired']
        })

        const info = (await res.json()) as GoogleTokenInfo;
        if (info.aud !== google.clientId) {
            throw new HttpException({
                errCode: 'OAUTH_GOOGLE_VALIDATE_TOKEN',
                statusCode: StatusCodes.BAD_GATEWAY,
                messages: [`Token audience mismatch: expected ${google.clientId}, got ${info.aud}`]
            })
        }

        const grantedScopes = info.scope.split(' ');
        for (const required of google.requiredScopes) {
            if (!grantedScopes.includes(required)) {
                throw new HttpException({
                    errCode: 'OAUTH_GOOGLE_VALIDATE_TOKEN',
                    statusCode: StatusCodes.BAD_GATEWAY,
                    messages: [`Missing required scope: ${required}`]
                })
            }
        }

        return info;
    }

    /**
     * Uses the validated access_token to fetch the user's profile info
     * (the data the user consented to share).
     * 
     * @param accessToken 
    */
    async userInfo(accessToken: string): Promise<GoogleUserInfo> {
        const res = await fetch(google.userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) throw new HttpException({
            errCode: 'OAUTH_GOOGLE_VALIDATE_TOKEN',
            statusCode: StatusCodes.BAD_GATEWAY,
            messages: ['Failed to fetch Google user info']
        })

        return res.json() as Promise<GoogleUserInfo>;
    }
}