import GraphQLJSON from "graphql-type-json";
import { GraphQLError } from "graphql";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { MarketplaceService } from "../../services/marketplace.service";
import { requireAuth, requireRole } from "../../middleware/auth";
import type { GraphQLContext } from "../../types/context";
import { contractSchema, loginSchema, paymentSchema, projectSchema, proposalSchema, registerSchema, reviewSchema } from "../../middleware/validation";
import { AppError } from "../../utils/errors";

const toNumber = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : Number(value.toString());
};

const handleAppError = (error: unknown): never => {
  if (error instanceof AppError) {
    throw new GraphQLError(error.message, {
      extensions: { code: "BAD_USER_INPUT", statusCode: error.statusCode },
    });
  }

  throw error;
};

export const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    getUsers: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireRole(context, ["ADMIN"]);
      return context.prisma.user.findMany({ include: { freelancerProfile: { include: { portfolioProjects: true } }, clientProfile: true } });
    },
    getUserById: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      requireAuth(context);
      return context.prisma.user.findUnique({ where: { id: args.id }, include: { freelancerProfile: { include: { portfolioProjects: true } }, clientProfile: true } });
    },
    getProjects: async (_parent: unknown, args: { status?: ProjectStatus; search?: string }, context: GraphQLContext) => {
      const where: Prisma.ProjectWhereInput = {};

      if (args.status) {
        where.status = args.status;
      }

      if (args.search) {
        where.OR = [{ title: { contains: args.search, mode: "insensitive" } }, { description: { contains: args.search, mode: "insensitive" } }];
      }

      return context.prisma.project.findMany({
        where,
        include: { client: true, proposals: true, contract: true },
        orderBy: { createdAt: "desc" },
      });
    },
    getProjectById: async (_parent: unknown, args: { id: string }, context: GraphQLContext) =>
      context.prisma.project.findUnique({ where: { id: args.id }, include: { client: true, proposals: { include: { freelancer: true } }, contract: true } }),
    getProposals: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const user = requireAuth(context);
      const where: Prisma.ProposalWhereInput =
        user.role === "ADMIN"
          ? {}
          : user.role === "FREELANCER"
            ? { freelancerId: user.id }
            : { project: { clientId: user.id } };

      return context.prisma.proposal.findMany({ where, include: { project: true, freelancer: true }, orderBy: { createdAt: "desc" } });
    },
    getContracts: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const user = requireAuth(context);
      const where: Prisma.ContractWhereInput =
        user.role === "ADMIN" ? {} : { OR: [{ clientId: user.id }, { freelancerId: user.id }] };

      return context.prisma.contract.findMany({ where, include: { project: true, client: true, freelancer: true, payments: true } });
    },
    getPayments: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const user = requireRole(context, ["ADMIN", "CLIENT"]);
      const where: Prisma.PaymentWhereInput = user.role === "ADMIN" ? {} : { contract: { clientId: user.id } };

      return context.prisma.payment.findMany({ where, include: { contract: true } });
    },
    getNotifications: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const user = requireAuth(context);
      return context.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    },
    dashboardMetrics: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireRole(context, ["ADMIN"]);
      const [totalUsers, activeFreelancers, activeClients, openProjects, completedProjects, paidPayments] = await Promise.all([
        context.prisma.user.count(),
        context.prisma.user.count({ where: { role: "FREELANCER" } }),
        context.prisma.user.count({ where: { role: "CLIENT" } }),
        context.prisma.project.count({ where: { status: "OPEN" } }),
        context.prisma.project.count({ where: { status: "COMPLETED" } }),
        context.prisma.payment.findMany({ where: { paymentStatus: "PAID" }, select: { amount: true } }),
      ]);

      return {
        totalUsers,
        activeFreelancers,
        activeClients,
        openProjects,
        completedProjects,
        revenue: paidPayments.reduce((sum, payment) => sum + (toNumber(payment.amount) ?? 0), 0),
      };
    },
  },
  Mutation: {
    register: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        const input = registerSchema.parse(args.input);
        return await MarketplaceService.register(input as any, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    login: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        const input = loginSchema.parse(args.input);
        return await MarketplaceService.login(input, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    createProject: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        const user = requireRole(context, ["CLIENT", "ADMIN"]);
        const input = projectSchema.parse(args.input);
        return await MarketplaceService.createProject(input, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    updateProject: async (_parent: unknown, args: { projectId: string; input: unknown }, context: GraphQLContext) => {
      try {
        const user = requireRole(context, ["CLIENT", "ADMIN"]);
        const input = projectSchema.partial().parse(args.input);
        return await MarketplaceService.updateProject(args.projectId, input, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    submitProposal: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        const user = requireRole(context, ["FREELANCER", "ADMIN"]);
        const input = proposalSchema.parse(args.input);
        return await MarketplaceService.submitProposal(input, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    acceptProposal: async (_parent: unknown, args: { proposalId: string }, context: GraphQLContext) => {
      try {
        const user = requireRole(context, ["CLIENT", "ADMIN"]);
        return await MarketplaceService.acceptProposal(args.proposalId, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    rejectProposal: async (_parent: unknown, args: { proposalId: string }, context: GraphQLContext) => {
      try {
        const user = requireRole(context, ["CLIENT", "ADMIN"]);
        return await MarketplaceService.rejectProposal(args.proposalId, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    createContract: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        const user = requireRole(context, ["CLIENT", "ADMIN"]);
        const input = contractSchema.parse(args.input);
        return await MarketplaceService.createContract(input, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    releasePayment: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        requireRole(context, ["CLIENT", "ADMIN"]);
        const input = paymentSchema.parse(args.input);
        return await MarketplaceService.releasePayment(input, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    createReview: async (_parent: unknown, args: { input: unknown }, context: GraphQLContext) => {
      try {
        const user = requireAuth(context);
        const input = reviewSchema.parse(args.input);
        return await MarketplaceService.createReview(input, user.id, context);
      } catch (error) {
        handleAppError(error);
      }
    },
    markNotificationRead: async (_parent: unknown, args: { notificationId: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      const notification = await context.prisma.notification.findFirst({ where: { id: args.notificationId, userId: user.id } });

      if (!notification) {
        throw new GraphQLError("Notification not found", { extensions: { code: "NOT_FOUND" } });
      }

      return context.prisma.notification.update({ where: { id: args.notificationId }, data: { isRead: true } });
    },
  },
  Subscription: {
    newNotification: {
      subscribe: async function* (_parent: unknown, args: { userId: string }, context: GraphQLContext) {
        const iterator = await context.pubsub.asyncIterableIterator("NEW_NOTIFICATION");
        for await (const payload of iterator as AsyncIterable<any>) {
          if (payload.userId === args.userId) {
            yield payload;
          }
        }
      },
    },
    newProposal: {
      subscribe: (_parent: unknown, _args: unknown, context: GraphQLContext) => context.pubsub.asyncIterableIterator("NEW_PROPOSAL"),
    },
    paymentUpdates: {
      subscribe: (_parent: unknown, _args: unknown, context: GraphQLContext) => context.pubsub.asyncIterableIterator("PAYMENT_UPDATE"),
    },
  },
  User: {
    freelancerProfile: (parent: any, _args: unknown, context: GraphQLContext) => parent.freelancerProfile ?? context.prisma.freelancerProfile.findUnique({ where: { userId: parent.id }, include: { portfolioProjects: true } }),
    clientProfile: (parent: any, _args: unknown, context: GraphQLContext) => parent.clientProfile ?? context.prisma.clientProfile.findUnique({ where: { userId: parent.id } }),
  },
  Project: {
    budget: (parent: any) => toNumber(parent.budget),
    client: (parent: any, _args: unknown, context: GraphQLContext) => parent.client ?? context.prisma.user.findUnique({ where: { id: parent.clientId } }),
    proposals: (parent: any, _args: unknown, context: GraphQLContext) => parent.proposals ?? context.prisma.proposal.findMany({ where: { projectId: parent.id } }),
    contract: (parent: any, _args: unknown, context: GraphQLContext) => parent.contract ?? context.prisma.contract.findUnique({ where: { projectId: parent.id } }),
  },
  Proposal: { proposedAmount: (parent: any) => toNumber(parent.proposedAmount) },
  Contract: { agreedAmount: (parent: any) => toNumber(parent.agreedAmount) },
  Payment: { amount: (parent: any) => toNumber(parent.amount) },
  FreelancerProfile: {
    hourlyRate: (parent: any) => toNumber(parent.hourlyRate),
    averageRating: (parent: any) => toNumber(parent.averageRating),
  },
};
