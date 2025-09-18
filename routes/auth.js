


// new code 

// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { SECRET } = require("../middleware/auth");
const crypto = require("crypto");

const router = express.Router();

// store reset tokens in-memory (for production: use DB table)
const resetTokens = {};

// optional email sending (confirmation + reset)
async function sendEmail(toEmail, subject, text) {
  if (process.env.EMAIL_CONFIRMATION_ENABLED !== "true") {
    console.log(`[EMAIL DISABLED] Would send "${subject}" to ${toEmail}: ${text}`);
    return;
  }

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  const from = process.env.EMAIL_FROM || "no-reply@digistore.test";
  await transporter.sendMail({ from, to: toEmail, subject, text });
}

/** simple email regex */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** generate 6-digit code */
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ---------------- REGISTER ---------------- */
router.post("/register", async (req, res) => {
  // (unchanged code)
});

/* ---------------- LOGIN ---------------- */
router.post("/login", async (req, res) => {
  // (unchanged code)
});

/* ---------------- CONFIRM EMAIL ---------------- */
router.post("/confirm", async (req, res) => {
  // (unchanged code)
});

/* ---------------- RESEND CONFIRM ---------------- */
router.post("/resend-confirm", async (req, res) => {
  // (unchanged code)
});

/* ---------------- FORGOT PASSWORD ---------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    resetTokens[token] = { userId: user.id, expires: Date.now() + 15 * 60 * 1000 }; // 15 min

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:4002"}/reset-password?token=${token}`;
    await sendEmail(user.email, "Password Reset", `Click here to reset password: ${resetLink}`);

    res.json({ ok: true, message: "Password reset link sent (if email enabled)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password required" });
    }

    const data = resetTokens[token];
    if (!data || data.expires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await User.update({ passwordHash: hash }, { where: { id: data.userId } });

    delete resetTokens[token]; // invalidate token after use

    res.json({ ok: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
