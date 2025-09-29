const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { DigitalKey, Product, Order, sequelize } = require("../models");
const router = express.Router();

// List all keys (admin)
router.get("/", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const keys = await DigitalKey.findAll({
      include: [
        { model: Product, as: "product" },
        { model: Order, as: "order" }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(keys);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Revoke/release a key (admin)
router.put(
  "/:id/revoke",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const key = await DigitalKey.findByPk(id);
      if (!key) return res.status(404).json({ error: "Key not found" });
      key.isAssigned = false;
      key.assignedToOrderId = null;
      await key.save();
      res.json({ message: "Key revoked", key });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
