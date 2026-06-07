import crypto from "crypto";
import type { IncomingMessage } from "http";
import { prisma } from "../config/database";
import { verifyAccessToken } from "../config/jwt";
import { pubsub, type GraphQLContext } from "../types/context";

export const createContext = async ({ req }: { req: IncomingMessage }): Promise<GraphQLContext> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return {
      prisma,
      currentUser: null,
      pubsub,
      requestId: crypto.randomUUID(),
    };
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    return {
      prisma,
      currentUser: user,
      pubsub,
      requestId: crypto.randomUUID(),
    };
  } catch {
    return {
      prisma,
      currentUser: null,
      pubsub,
      requestId: crypto.randomUUID(),
    };
  }
};
