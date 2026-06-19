import { configDotenv } from "dotenv";
import { bool, cleanEnv, json, makeValidator, num, str } from "envalid";

configDotenv({ quiet: true })

export enum Environments {
    PRODUCTION = 'production',
    DEV = 'development',
    TEST = 'test',
    STAGING = 'staging',
}

export enum Logs {
    ALL = 'all',
    NONE = 'none',
    PRISMA = 'prisma',
    FTP = 'ftp'
}

const ftpConfigValidator = makeValidator<boolean | string | undefined>(
    (input) => {
        if (input === undefined || input === '') {
            return undefined
        }

        if (input === 'true') return true
        if (input === 'false') return false

        return input
    })

const config = {
    APP_NAME: str({ default: 'DriveAPI' }),
    NODE_ENV: str({
        default: Environments.DEV,
        choices: [...Object.values(Environments)],
    }),
    NODE_REJECT_UNAUTHORIZE: bool({ default: false }),
    LOG: str({
        default: Logs.NONE,
        choices: [...Object.values(Logs)]
    }),
    PORT: num({ default: 9000 }),
    API_URL: str({ default: 'localhost' }),

    JWT_SECRET: str({ default: 'jwt-secret' }),
    JWT_EXPIRE: str({ default: '30m' }),
    E_SALT: str(),

    DATABASE_URL: str({ default: 'postgres://personal:Pers0nal@10.121.75.73:5432/personal?schema=public' }),
    FTP_HOST: str({ default: 'localhost' }),
    FTP_USERNAME: str(),
    FTP_PASSWORD: str(),
    FTP_CONFIG: ftpConfigValidator({
        default: 'implicit'
    }),
    FTP_HOME_DIR: str({ default: '' }),

    GOOGLE_CLIENT_ID: str(),
    GOOGLE_CLIENT_SECRET: str(),
    GOOGLE_REDIRECT_URL: str(),
}

export const env = cleanEnv(process.env, config)
export const google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URL,

    // Scopes we request from the user
    scopes: [
        'openid',
        'email',
        'profile',
    ],

    // URLs
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    tokenInfoUrl: 'https://www.googleapis.com/oauth2/v3/tokeninfo',

    // Required scopes that MUST be present in the access token
    // (backend validation step)
    requiredScopes: ['openid', 'https://www.googleapis.com/auth/userinfo.email'],
} as const;