import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../types/context";

export const requireAuth = (context: GraphQLContext) => {
  if (!context.currentUser) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  return context.currentUser;
};

export const requireRole = (context: GraphQLContext, roles: string[]) => {
  const user = requireAuth(context);

  if (!roles.includes(user.role)) {
    throw new GraphQLError("You are not authorized to perform this action", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  return user;
};
