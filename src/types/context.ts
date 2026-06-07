import type { User } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";
import { prisma } from "../config/database";

export const pubsub = new PubSub();

export type GraphQLContext = {
  prisma: typeof prisma;
  currentUser: User | null;
  pubsub: typeof pubsub;
  requestId: string;
};
