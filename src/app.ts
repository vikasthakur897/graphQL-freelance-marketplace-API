import http from "http";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import depthLimit from "graphql-depth-limit";
import { APP_NAME, CORS_ORIGIN, DEFAULT_PORT, GRAPHQL_DEPTH_LIMIT } from "./config/constants";
import { typeDefs } from "./graphql/typeDefs";
import { resolvers } from "./graphql/resolvers";
import { createContext } from "./middleware/context";

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(GRAPHQL_DEPTH_LIMIT)],
  introspection: true,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

async function bootstrap() {
  await server.start();

  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/graphql", expressMiddleware(server, { context: createContext }));

  await new Promise<void>((resolve) => httpServer.listen({ port: DEFAULT_PORT }, resolve));
  console.log(`${APP_NAME} ready at http://localhost:${DEFAULT_PORT}/graphql`);
}

bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});
