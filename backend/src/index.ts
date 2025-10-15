import express, { type Request } from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import { schema } from "./schema.ts";
import { rootResolver } from "./resolvers/index.ts";
import { connectDb } from "./utils/db.ts";
import { authenticate, type AuthRequest } from "./middleware/auth.ts";
import dotenv from "dotenv";
import { Screenshot } from "./models/ScreenShot.ts";
import path from "path";
import fs from "fs"
import multer from "multer";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

connectDb();
app.use("/graphql", (req, res, next) => {
  const body = req.body;
  if (body?.query?.includes("login") || body?.query?.includes("register") || body?.query?.includes("resendOTP") || body?.query?.includes("verifyOtp") || body?.query?.includes("forgotPassword") || body?.query?.includes("resetPassword")) {
    return next();
  }
  authenticate(req, res, next);
});

const uploadDir = path.join(process.cwd(), "uploads", "screenshots");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => any) => cb(null, uploadDir),
  filename: (req: any, file: { originalname: string; }, cb: (arg0: null, arg1: string) => void) => {
    const uniqueName = `screenshot_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

app.post("/upload-screenshot", upload.single("screenshot"), async (req:any, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const screenshot = await Screenshot.create({
      userId,
      filename: req.file.filename,
      filePath: req.file.path,
    });

    res.json({ success: true, screenshot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
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
