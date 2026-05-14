import { configDotenv } from "dotenv";
import { cleanEnv, json, num, str } from "envalid";

configDotenv({
    quiet: true,
    path: [
        '.env',
        '.env.local'
    ]
})

export enum Environments {
    PRODUCTION = 'production',
    DEV = 'development',
    TEST = 'test',
    STAGING = 'staging',
}

const config = {
    NODE_ENV: str({
        default: Environments.DEV,
        choices: [...Object.values(Environments)],
    }),
    PORT: num({ default: 9000 }),
    
    JWT_SECRET: str({ default: 'jwt-secret' }),
    JWT_EXPIRE: str({ default: '30m' }),
    E_SALT: str(),
    
    DATABASE_URL: str({ default: 'postgres://personal:Pers0nal@10.121.75.73:5432/personal?schema=public' }),
    FTP_HOST: str({ default: 'localhost' }),
    FTP_PORTS: str(),
    FTP_USERNAME: str(),
    FTP_PASSWORD: str(),
    FTP_CONFIG: json({ desc: `{ secure: boolean; }` }),

    GOOGLE_CLIENT_ID: str(),
    GOOGLE_CLIENT_SECRET: str(),
}

export const env = cleanEnv(process.env, config)