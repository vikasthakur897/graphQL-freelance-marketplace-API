import gql from "graphql-tag";

export const typeDefs = gql`
  scalar JSON

  enum UserRole { CLIENT FREELANCER ADMIN }
  enum ProjectStatus { DRAFT OPEN IN_PROGRESS COMPLETED CANCELLED ARCHIVED }
  enum BudgetType { FIXED HOURLY }
  enum ProjectType { ONE_TIME ONGOING }
  enum ProposalStatus { PENDING ACCEPTED REJECTED }
  enum ContractStatus { PENDING ACTIVE COMPLETED CANCELLED }
  enum PaymentStatus { PENDING PAID FAILED REFUNDED }
  enum PaymentMethod { CARD BANK_TRANSFER WALLET ESCROW }
  enum AvailabilityStatus { AVAILABLE BUSY OFFLINE }
  enum NotificationType { PROPOSAL_SUBMITTED PROPOSAL_ACCEPTED PROPOSAL_REJECTED CONTRACT_CREATED PAYMENT_RECEIVED PROJECT_COMPLETED SYSTEM }

  type User { id: ID! firstName: String! lastName: String! email: String! role: UserRole! phone: String country: String profileImage: String bio: String skills: [String!]! emailVerified: Boolean! createdAt: String! updatedAt: String! freelancerProfile: FreelancerProfile clientProfile: ClientProfile }
  type FreelancerProfile { id: ID! title: String overview: String experience: String education: String hourlyRate: Float availabilityStatus: AvailabilityStatus! averageRating: Float! totalReviews: Int! portfolioProjects: [PortfolioProject!]! }
  type PortfolioProject { id: ID! title: String! description: String projectUrl: String imageUrl: String createdAt: String! }
  type ClientProfile { id: ID! companyName: String website: String industry: String companyDescription: String hiringHistory: Int! }
  type Project { id: ID! title: String! description: String! budget: Float! budgetType: BudgetType! projectType: ProjectType! skillsRequired: [String!]! deadline: String status: ProjectStatus! clientId: String! client: User! proposals: [Proposal!]! contract: Contract createdAt: String! updatedAt: String! }
  type Proposal { id: ID! projectId: String! freelancerId: String! coverLetter: String! proposedAmount: Float! estimatedDuration: String! status: ProposalStatus! project: Project! freelancer: User! createdAt: String! updatedAt: String! }
  type Contract { id: ID! projectId: String! clientId: String! freelancerId: String! agreedAmount: Float! startDate: String! endDate: String status: ContractStatus! project: Project! client: User! freelancer: User! payments: [Payment!]! createdAt: String! updatedAt: String! }
  type Payment { id: ID! contractId: String! amount: Float! paymentMethod: PaymentMethod! transactionReference: String! paymentStatus: PaymentStatus! paidAt: String contract: Contract! createdAt: String! updatedAt: String! }
  type Review { id: ID! rating: Int! reviewText: String reviewerId: String! receiverId: String! reviewer: User! receiver: User! createdAt: String! updatedAt: String! }
  type Notification { id: ID! userId: String! title: String! message: String! isRead: Boolean! type: NotificationType! createdAt: String! updatedAt: String! }
  type AuthPayload { accessToken: String! refreshToken: String! user: User! message: String! }
  type DashboardMetrics { totalUsers: Int! activeFreelancers: Int! activeClients: Int! revenue: Float! openProjects: Int! completedProjects: Int! }

  input RegisterInput { firstName: String! lastName: String! email: String! password: String! role: UserRole! phone: String country: String }
  input LoginInput { email: String! password: String! }
  input CreateProjectInput { title: String! description: String! budget: Float! budgetType: BudgetType! projectType: ProjectType! skillsRequired: [String!]! deadline: String status: ProjectStatus }
  input UpdateProjectInput { title: String description: String budget: Float budgetType: BudgetType projectType: ProjectType skillsRequired: [String!] deadline: String status: ProjectStatus }
  input SubmitProposalInput { projectId: String! coverLetter: String! proposedAmount: Float! estimatedDuration: String! }
  input CreateContractInput { projectId: String! freelancerId: String! agreedAmount: Float! startDate: String! endDate: String }
  input ReleasePaymentInput { contractId: String! amount: Float! paymentMethod: PaymentMethod! }
  input CreateReviewInput { receiverId: String! contractId: String rating: Int! reviewText: String }

  type Query {
    getUsers: [User!]!
    getUserById(id: String!): User
    getProjects(status: ProjectStatus, search: String): [Project!]!
    getProjectById(id: String!): Project
    getProposals: [Proposal!]!
    getContracts: [Contract!]!
    getPayments: [Payment!]!
    getNotifications: [Notification!]!
    dashboardMetrics: DashboardMetrics!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createProject(input: CreateProjectInput!): Project!
    updateProject(projectId: String!, input: UpdateProjectInput!): Project!
    submitProposal(input: SubmitProposalInput!): Proposal!
    acceptProposal(proposalId: String!): Proposal!
    rejectProposal(proposalId: String!): Proposal!
    createContract(input: CreateContractInput!): Contract!
    releasePayment(input: ReleasePaymentInput!): Payment!
    createReview(input: CreateReviewInput!): Review!
    markNotificationRead(notificationId: String!): Notification!
  }

  type Subscription {
    newNotification(userId: String!): Notification!
    newProposal: Proposal!
    paymentUpdates: Payment!
  }
`;
