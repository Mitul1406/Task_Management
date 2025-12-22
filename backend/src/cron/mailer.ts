import nodemailer from "nodemailer";
import fs from "fs";

export const loadTemplate = (filePath: string, replacements: Record<string, string>) => {
  let template = fs.readFileSync(filePath, "utf8");

  for (const key in replacements) {
    const value:any = replacements[key];
    template = template.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return template;
};

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});
