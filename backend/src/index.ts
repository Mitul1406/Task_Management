import express, { type Request } from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import { schema } from "./schema.ts";
import { rootResolver } from "./resolvers/index.ts";
import { connectDb } from "./utils/db.ts";
import { authenticate, type AuthRequest } from "./middleware/auth.ts";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import multer from "multer";
import { Screenshot } from "./models/Screenshot.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDb();

// --- Authentication for GraphQL ---
app.use("/graphql", (req, res, next) => {
  const body = req.body;
  if (
    body?.query?.includes("login") ||
    body?.query?.includes("register") ||
    body?.query?.includes("resendOTP") ||
    body?.query?.includes("verifyOtp")
  ) {
    return next();
  }
  authenticate(req, res, next);
});

// --- Serve static files ---
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// --- GraphQL endpoint ---
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

// --- Screenshot REST endpoint ---

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "screenshots");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => any) => cb(null, UPLOAD_DIR),
  filename: (req: any, file: { originalname: any; }, cb: (arg0: null, arg1: string) => void) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB limit

app.post(
  "/upload-screenshot",
  authenticate,
  upload.single("file"),
  async (req: any, res) => {
    try {
      const userId = (req as AuthRequest).user.id;
      const filePath = `uploads/screenshots/${req.file.filename}`;

      await Screenshot.create({ userId, filePath });

      res.json({ success: true, message: "Screenshot uploaded successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  }
);

app.listen(4040, () => console.log("Server running on port 4040"));
