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
import type { Response } from "express-serve-static-core";
import s3 from "./utils/s3config.ts"
import { User } from "./models/User.ts";
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

// const uploadDir = path.join(process.cwd(), "uploads", "screenshots");
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req: any, file: any, cb: (arg0: null, arg1: string) => any) => cb(null, uploadDir),
//   filename: (req: any, file: { originalname: string; }, cb: (arg0: null, arg1: string) => void) => {
//     const uniqueName = `screenshot_${Date.now()}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });
const upload = multer({ storage:multer.memoryStorage() });

// app.post("/upload-screenshot",authenticate, upload.single("screenshot"), async (req:any, res) => {
//   try {
//     const { userId } = req.body;
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });
//     if (!userId) return res.status(400).json({ error: "Missing userId" });

//     const screenshot = await Screenshot.create({
//       userId,
//       filename: req.file.filename,
//       filePath: req.file.path,
//     });

//     res.json({ success: true, screenshot });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// });

app.post("/upload-screenshot", authenticate, upload.single("screenshot"), async (req:any, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const username:any= await User.findById(userId)
    // Generate unique file name
    const ext = path.extname(req.file.originalname) || ".webp";
    const now = new Date();

const hours = String(now.getHours()).padStart(2, "0");
const minutes = String(now.getMinutes()).padStart(2, "0");
const seconds = String(now.getSeconds()).padStart(2, "0");

const timeString = `${hours}-${minutes}-${seconds}`;
    const fileName = `screenshot_${timeString}${ext}`;
    const key = `user/${username.username}/${fileName}`;

    const uploadResult = await s3
      .upload({
        Bucket: process.env.AWS_BUCKET_NAME || "usersscreenshots",
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
      .promise();

    const screenshot = await Screenshot.create({
      userId,
      filename: fileName,
      filePath: key,
      url: uploadResult.Location,
    });

    res.json({ success: true, screenshot });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// app.delete("/screenshots", authenticate, async (req: any, res) => {
//   try {
//     const { ids } = req.body; 
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({ error: "No screenshots specified" });
//     }
//     const screenshots = await Screenshot.find({ _id: { $in: ids } });
//     for (const shot of screenshots) {
//       if (fs.existsSync((shot as any).filePath)) fs.unlinkSync((shot as any).filePath);
//     }
//     await Screenshot.deleteMany({ _id: { $in: ids } });
//     res.json({ success: true, deletedCount: screenshots.length });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// });

app.delete("/screenshots", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No screenshots specified" });
    }

    const screenshots = await Screenshot.find({ _id: { $in: ids } });

    const deleteObjects = screenshots.map((shot) => ({
      Key: shot.filePath as string,  
    }));

    await s3
      .deleteObjects({
        Bucket: process.env.AWS_BUCKET_NAME || "usersscreenshots",
        Delete: { Objects: deleteObjects },
      })
      .promise();

    await Screenshot.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deletedCount: screenshots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
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

let clients:any = {}; 

app.get("/events/:userId", (req, res) => {
  const userId:any = req.params.userId;
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  if (!clients[userId]) clients[userId] = [];
  clients[userId].push(res);

  req.on("close", () => {
    clients[userId] = clients[userId].filter((r: Response<any, Record<string, any>, number>) => r !== res);
  });
});

app.post("/broadcast-task-update", (req, res) => {
  const { userId, task } = req.body;

  if (!userId || !task) return res.status(400).send("Missing userId or task");
   
  (clients[userId] || []).forEach((clientRes: { write: (arg0: string) => void; }) => {
    clientRes.write(
  `data: ${JSON.stringify({
    ...task,
    projectId: task.projectId
  })}\n\n`
);

  });

  res.json({ success: true });
});

app.post("/broadcast-stop-confirm", (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).send("Missing userId");

  (clients[userId] || []).forEach((clientRes: any) => {
    clientRes.write(`data: ${JSON.stringify({ stopConfirmed: true })}\n\n`);
  });

  res.json({ success: true });
});

app.listen(4040, () => {
  console.log(`Server running at port 4040`);
});
