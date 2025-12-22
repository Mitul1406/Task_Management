import { buildSchema } from "graphql";
import { readFileSync } from "fs";
import path from "path";

const schemaString =
  readFileSync(path.join("src/graphql/types.graphql"), "utf8") +
  readFileSync(path.join("src/graphql/queries.graphql"), "utf8") +
  readFileSync(path.join("src/graphql/mutations.graphql"), "utf8");

export const schema = buildSchema(schemaString);
