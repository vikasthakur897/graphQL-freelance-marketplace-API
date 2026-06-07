import { PrismaClient, UserRole, ProjectStatus, ProposalStatus, ContractStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  const clientPassword = await hashPassword("Client@123");
  const freelancerPassword = await hashPassword("Freelancer@123");
  const adminPassword = await hashPassword("Admin@123");

  const client = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      firstName: "Cynthia",
      lastName: "Client",
      email: "client@example.com",
      password: clientPassword,
      role: UserRole.CLIENT,
      emailVerified: true,
      clientProfile: { create: { companyName: "Acme Labs", website: "https://acme.example.com", industry: "SaaS", companyDescription: "Product-focused hiring company" } },
    },
  });

  const freelancer = await prisma.user.upsert({
    where: { email: "freelancer@example.com" },
    update: {},
    create: {
      firstName: "Frank",
      lastName: "Freelancer",
      email: "freelancer@example.com",
      password: freelancerPassword,
      role: UserRole.FREELANCER,
      emailVerified: true,
      skills: ["GraphQL", "Node.js", "TypeScript"],
      freelancerProfile: { create: { title: "Senior Full Stack Developer", overview: "Specialized in GraphQL marketplace platforms", experience: "7 years", education: "B.Tech Computer Science", hourlyRate: 60 } },
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { firstName: "Alice", lastName: "Admin", email: "admin@example.com", password: adminPassword, role: UserRole.ADMIN, emailVerified: true },
  });

  const project = await prisma.project.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Build GraphQL Marketplace",
      description: "Need an MVP for a freelance marketplace with secure contracts and payments.",
      budget: 5000,
      budgetType: "FIXED",
      projectType: "ONE_TIME",
      skillsRequired: ["GraphQL", "Prisma", "PostgreSQL"],
      status: ProjectStatus.OPEN,
      clientId: client.id,
    },
  });

  const proposal = await prisma.proposal.upsert({
    where: { projectId_freelancerId: { projectId: project.id, freelancerId: freelancer.id } },
    update: {},
    create: {
      projectId: project.id,
      freelancerId: freelancer.id,
      coverLetter: "I can deliver a scalable marketplace with Apollo Server, Prisma, and production-grade auth.",
      proposedAmount: 4800,
      estimatedDuration: "6 weeks",
      status: ProposalStatus.ACCEPTED,
    },
  });

  const contract = await prisma.contract.upsert({
    where: { projectId: project.id },
    update: {},
    create: { projectId: project.id, clientId: client.id, freelancerId: freelancer.id, agreedAmount: proposal.proposedAmount, startDate: new Date(), status: ContractStatus.ACTIVE },
  });

  await prisma.payment.createMany({
    data: [{ contractId: contract.id, amount: 2400, paymentMethod: PaymentMethod.ESCROW, transactionReference: "seed-payment-1", paymentStatus: PaymentStatus.PAID, paidAt: new Date() }],
    skipDuplicates: true,
  });

  console.log("Seed completed successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
