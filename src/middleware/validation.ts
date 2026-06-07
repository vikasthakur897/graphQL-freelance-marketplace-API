import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(["CLIENT", "FREELANCER", "ADMIN"]).default("CLIENT"),
  phone: z.string().optional(),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const projectSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  budget: z.number().positive(),
  budgetType: z.enum(["FIXED", "HOURLY"]),
  projectType: z.enum(["ONE_TIME", "ONGOING"]),
  skillsRequired: z.array(z.string()).default([]),
  deadline: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"]).optional(),
});

export const proposalSchema = z.object({
  projectId: z.string().uuid(),
  coverLetter: z.string().min(20),
  proposedAmount: z.number().positive(),
  estimatedDuration: z.string().min(2),
});

export const contractSchema = z.object({
  projectId: z.string().uuid(),
  freelancerId: z.string().uuid(),
  agreedAmount: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

export const paymentSchema = z.object({
  contractId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER", "WALLET", "ESCROW"]),
});

export const reviewSchema = z.object({
  receiverId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(5).optional(),
});
