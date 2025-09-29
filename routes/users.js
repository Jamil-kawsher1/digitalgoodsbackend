// const express = require("express");
// const { authRequired } = require("../middleware/auth");

// const router = express.Router();

// router.get("/me", authRequired, (req, res) => {
//   res.json({ id: req.user.id, email: req.user.email, role: req.user.role });
// });

// module.exports = router;



const express = require("express");
const bcrypt = require("bcrypt");
const { authRequired, requireRole } = require("../middleware/auth");
const { User, sequelize } = require("../models");

const router = express.Router();

// GET /users/me  (already exists)
router.get("/me", authRequired, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, role: req.user.role });
});

// ADMIN: Create new user with role
router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, and role required" });
    }

    if (!["admin", "customer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash, role });

    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
