import express, { type Request } from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import { schema } from "./schema.ts";
import { rootResolver } from "./resolvers/index.ts";
import { connectDb } from "./utils/db.ts";
import { authenticate, type AuthRequest } from "./middleware/auth.ts";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

connectDb();
app.use("/graphql", (req, res, next) => {
  const body = req.body;
  if (body?.query?.includes("login") || body?.query?.includes("register")) {
    return next();
  }
  authenticate(req, res, next);
});

app.use(
  "/graphql",
  graphqlHTTP((req: any) => ({
    schema,
    rootValue: rootResolver,
    graphiql: true,
    context: {
      user: (req as AuthRequest).user,
    },
  }))
);

app.listen(4040, () => {
  console.log(`Server running at port 4040`);
});
