//

//new Auth Code

// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { SECRET } = require("../middleware/auth");
const crypto = require("crypto");

const router = express.Router();

// optional email sending (only if EMAIL_CONFIRMATION_ENABLED === 'true')
async function sendConfirmationEmail(toEmail, code) {
  if (process.env.EMAIL_CONFIRMATION_ENABLED !== "true") {
    console.log(
      `[EMAIL DISABLED] Would send confirmation ${code} to ${toEmail}`
    );
    return;
  }

  // nodemailer is optional — install it if you enable email sending
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
  const subject = "Confirm your DigiStore email";
  const text = `Your confirmation code: ${code}\n\nIf you didn't request this, ignore.`;

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

/** registration */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing email or password" });

    if (!isValidEmail(email))
      return res.status(400).json({ error: "Invalid email format" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    const confirmationEnabled =
      process.env.EMAIL_CONFIRMATION_ENABLED === "true";
    const confirmationRequired =
      process.env.EMAIL_CONFIRMATION_REQUIRED === "true";

    let userAttrs = {
      name: name ?? null,
      email,
      passwordHash: hash,
      role: "customer",
    };

    if (confirmationRequired || confirmationEnabled) {
      // create with unconfirmed status and code
      const code = generateCode();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
      userAttrs.emailConfirmed = false;
      userAttrs.confirmationCode = code;
      userAttrs.confirmationCodeExpires = expires;
    } else {
      // immediately confirmed
      userAttrs.emailConfirmed = true;
      userAttrs.confirmationCode = null;
      userAttrs.confirmationCodeExpires = null;
    }

    const user = await User.create(userAttrs);

    // attempt to send email only if email sending is enabled
    if (confirmationEnabled) {
      try {
        await sendConfirmationEmail(email, user.confirmationCode);
      } catch (err) {
        console.error("Failed to send confirmation email:", err);
      }
    } else {
      console.log(
        "Email sending disabled - confirmation code:",
        user.confirmationCode
      );
    }

    // create JWT as before (you might prefer to wait until confirm — configurable)
    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "7d" });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        emailConfirmed: user.emailConfirmed,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/** login */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });
    if (!isValidEmail(email))
      return res.status(400).json({ error: "Invalid email format" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // if confirmation required, block login until emailConfirmed === true
    if (
      process.env.EMAIL_CONFIRMATION_REQUIRED === "true" &&
      !user.emailConfirmed
    ) {
      return res
        .status(403)
        .json({
          error:
            "Email not confirmed. Please confirm your email before logging in.",
        });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "7d" });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        emailConfirmed: user.emailConfirmed,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/** Confirm code endpoint */
router.post("/confirm", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ error: "Email and code required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailConfirmed)
      return res.status(400).json({ error: "Email already confirmed" });

    if (
      !user.confirmationCode ||
      String(user.confirmationCode) !== String(code)
    ) {
      return res.status(400).json({ error: "Invalid code" });
    }

    if (
      user.confirmationCodeExpires &&
      new Date(user.confirmationCodeExpires) < new Date()
    ) {
      return res.status(400).json({ error: "Code expired" });
    }

    user.emailConfirmed = true;
    user.confirmationCode = null;
    user.confirmationCodeExpires = null;
    await user.save();

    res.json({ ok: true, message: "Email confirmed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/** Resend confirmation code */
router.post("/resend-confirm", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailConfirmed)
      return res.status(400).json({ error: "Email already confirmed" });

    const code = generateCode();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    user.confirmationCode = code;
    user.confirmationCodeExpires = expires;
    await user.save();

    if (process.env.EMAIL_CONFIRMATION_ENABLED === "true") {
      try {
        await sendConfirmationEmail(user.email, code);
      } catch (err) {
        console.error("Failed to send confirmation email:", err);
      }
    } else {
      console.log(
        "[EMAIL DISABLED] New confirmation code for",
        user.email,
        "=>",
        code
      );
    }

    res.json({
      ok: true,
      message: "Confirmation code sent (if email sending enabled)",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
