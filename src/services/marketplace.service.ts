import { Prisma, type UserRole, type NotificationType } from "@prisma/client";
import type { GraphQLContext } from "../types/context";
import { AppError } from "../utils/errors";
import { comparePassword, hashPassword } from "../utils/password";
import { createToken } from "../utils/token";
import { signAccessToken, signRefreshToken } from "../config/jwt";
import { calculateAverageRating } from "../utils/rating";

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value);

export class MarketplaceService {
  static async register(
    input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: UserRole;
      phone?: string;
      country?: string;
    },
    context: GraphQLContext,
  ) {
    const existingUser = await context.prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const hashedPassword = await hashPassword(input.password);
    const verificationToken = createToken();

    const userData: Prisma.UserCreateInput = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: hashedPassword,
      role: input.role,
      emailVerificationToken: verificationToken,
    };

    if (input.phone !== undefined) {
      userData.phone = input.phone;
    }

    if (input.country !== undefined) {
      userData.country = input.country;
    }

    if (input.role === "FREELANCER") {
      userData.freelancerProfile = { create: {} };
    }

    if (input.role === "CLIENT") {
      userData.clientProfile = { create: {} };
    }

    const user = await context.prisma.user.create({
      data: userData,
      include: {
        freelancerProfile: { include: { portfolioProjects: true } },
        clientProfile: true,
      },
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await context.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return {
      accessToken,
      refreshToken,
      user,
      message: "Registration successful. Verify email using the generated token.",
    };
  }

  static async login(input: { email: string; password: string }, context: GraphQLContext) {
    const user = await context.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        freelancerProfile: { include: { portfolioProjects: true } },
        clientProfile: true,
      },
    });

    if (!user || !(await comparePassword(input.password, user.password))) {
      throw new AppError("Invalid email or password", 401);
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await context.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return {
      accessToken,
      refreshToken,
      user,
      message: "Login successful",
    };
  }

  static async createProject(input: any, userId: string, context: GraphQLContext) {
    return context.prisma.project.create({
      data: {
        ...input,
        budget: decimal(input.budget),
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        clientId: userId,
      },
      include: { client: true },
    });
  }

  static async updateProject(projectId: string, input: any, userId: string, context: GraphQLContext) {
    const project = await context.prisma.project.findUnique({ where: { id: projectId } });
    const isAdmin = context.currentUser?.role === "ADMIN";
    if (!project || (!isAdmin && project.clientId !== userId)) {
      throw new AppError("Project not found or access denied", 404);
    }

    return context.prisma.project.update({
      where: { id: projectId },
      data: {
        ...input,
        budget: input.budget !== undefined ? decimal(input.budget) : undefined,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
      },
      include: { client: true },
    });
  }

  static async submitProposal(input: any, freelancerId: string, context: GraphQLContext) {
    const proposal = await context.prisma.proposal.create({
      data: {
        ...input,
        proposedAmount: decimal(input.proposedAmount),
        freelancerId,
      },
      include: { project: true, freelancer: true },
    });

    const project = await context.prisma.project.findUnique({ where: { id: input.projectId } });
    if (project) {
      await this.notify(project.clientId, "Proposal submitted", `A new proposal was submitted for ${project.title}`, "PROPOSAL_SUBMITTED", context);
      await context.pubsub.publish("NEW_PROPOSAL", { newProposal: proposal });
    }

    return proposal;
  }

  static async acceptProposal(proposalId: string, clientId: string, context: GraphQLContext) {
    const proposal = await context.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { project: true, freelancer: true },
    });

    const isAdmin = context.currentUser?.role === "ADMIN";
    if (!proposal || (!isAdmin && proposal.project.clientId !== clientId)) {
      throw new AppError("Proposal not found or access denied", 404);
    }

    const updatedProposal = await context.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED" },
      include: { project: true, freelancer: true },
    });

    await context.prisma.proposal.updateMany({
      where: { projectId: proposal.projectId, id: { not: proposalId } },
      data: { status: "REJECTED" },
    });

    await this.notify(proposal.freelancerId, "Proposal accepted", `Your proposal for ${proposal.project.title} was accepted`, "PROPOSAL_ACCEPTED", context);
    return updatedProposal;
  }

  static async rejectProposal(proposalId: string, clientId: string, context: GraphQLContext) {
    const proposal = await context.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { project: true, freelancer: true },
    });

    const isAdmin = context.currentUser?.role === "ADMIN";
    if (!proposal || (!isAdmin && proposal.project.clientId !== clientId)) {
      throw new AppError("Proposal not found or access denied", 404);
    }

    const updatedProposal = await context.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "REJECTED" },
      include: { project: true, freelancer: true },
    });

    await this.notify(proposal.freelancerId, "Proposal rejected", `Your proposal for ${proposal.project.title} was rejected`, "PROPOSAL_REJECTED", context);
    return updatedProposal;
  }

  static async createContract(input: any, clientId: string, context: GraphQLContext) {
    const project = await context.prisma.project.findUnique({ where: { id: input.projectId } });
    const isAdmin = context.currentUser?.role === "ADMIN";
    if (!project || (!isAdmin && project.clientId !== clientId)) {
      throw new AppError("Project not found or access denied", 404);
    }

    const contractData: Prisma.ContractUncheckedCreateInput = {
        projectId: input.projectId,
        clientId: project.clientId,
        freelancerId: input.freelancerId,
        agreedAmount: decimal(input.agreedAmount),
        startDate: new Date(input.startDate),
        status: "ACTIVE",
        signedAt: new Date(),
    };

    if (input.endDate) {
      contractData.endDate = new Date(input.endDate);
    }

    const contract = await context.prisma.contract.create({
      data: contractData,
      include: {
        project: true,
        client: true,
        freelancer: true,
        payments: true,
      },
    });

    await context.prisma.project.update({ where: { id: input.projectId }, data: { status: "IN_PROGRESS" } });
    await this.notify(input.freelancerId, "Contract created", `A contract was created for ${project.title}`, "CONTRACT_CREATED", context);
    return contract;
  }

  static async releasePayment(input: any, context: GraphQLContext) {
    const contract = await context.prisma.contract.findUnique({ where: { id: input.contractId } });
    const isAdmin = context.currentUser?.role === "ADMIN";
    if (!contract || (!isAdmin && contract.clientId !== context.currentUser?.id)) {
      throw new AppError("Contract not found or access denied", 404);
    }

    const payment = await context.prisma.payment.create({
      data: {
        contractId: input.contractId,
        amount: decimal(input.amount),
        paymentMethod: input.paymentMethod,
        transactionReference: createToken(),
        paymentStatus: "PAID",
        paidAt: new Date(),
      },
      include: {
        contract: { include: { freelancer: true, project: true } },
      },
    });

    await this.notify(payment.contract.freelancerId, "Payment received", `Payment received for ${payment.contract.project.title}`, "PAYMENT_RECEIVED", context);
    await context.pubsub.publish("PAYMENT_UPDATE", { paymentUpdates: payment });
    return payment;
  }

  static async createReview(input: any, reviewerId: string, context: GraphQLContext) {
    const review = await context.prisma.review.create({
      data: { ...input, reviewerId },
      include: { reviewer: true, receiver: true },
    });

    const reviews = await context.prisma.review.findMany({ where: { receiverId: input.receiverId }, select: { rating: true } });
    const user = await context.prisma.user.findUnique({ where: { id: input.receiverId }, include: { freelancerProfile: true } });

    if (user?.freelancerProfile) {
      await context.prisma.freelancerProfile.update({
        where: { id: user.freelancerProfile.id },
        data: {
          averageRating: decimal(calculateAverageRating(reviews.map((item) => item.rating))),
          totalReviews: reviews.length,
        },
      });
    }

    return review;
  }

  static async notify(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    context: GraphQLContext,
  ) {
    const notification = await context.prisma.notification.create({
      data: { userId, title, message, type },
    });

    await context.pubsub.publish("NEW_NOTIFICATION", { newNotification: notification, userId });
    return notification;
  }
}
