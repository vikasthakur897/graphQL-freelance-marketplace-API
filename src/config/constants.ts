import "dotenv/config";

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
};

export const APP_NAME = "Freelance Marketplace GraphQL API";
export const DEFAULT_PORT = Number(process.env.PORT ?? 4000);
export const DATABASE_URL = requiredEnv("DATABASE_URL");
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";
export const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
export const GRAPHQL_DEPTH_LIMIT = Number(process.env.GRAPHQL_DEPTH_LIMIT ?? 7);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
