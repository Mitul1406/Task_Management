import express from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import { schema } from "./schema.ts";
import { rootResolver } from "./resolvers/index.ts";
import { connectDb } from "./utils/db.ts";

const app = express();
app.use(cors());
app.use(express.json());

connectDb();

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: rootResolver,
    graphiql: true,
  })
);

app.listen(4040, () => {
  console.log(`Server running at port 4040`);
});
