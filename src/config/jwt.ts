import jwt from "jsonwebtoken";
import { REFRESH_TOKEN_EXPIRES_IN, JWT_EXPIRES_IN } from "./constants";

const accessSecret = process.env.JWT_SECRET ?? "dev-access-secret";
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret";

export type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, accessSecret, { expiresIn: JWT_EXPIRES_IN as any });

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, refreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN as any });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, accessSecret) as JwtPayload;
