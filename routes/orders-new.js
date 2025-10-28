const express = require("express");
const { Order, Product, DigitalKey, User, sequelize } = require("../models");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin update order status
router.post(
  "/:id/status",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = status;
      await order.save();

      // Return updated order with all relationships for immediate UI update
      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });

      res.json({
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Admin remove key from order
router.post(
  "/:id/keys/:keyId/remove",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id, keyId } = req.params;
      const order = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      // Find and remove key
      const keyToRemove = await DigitalKey.findByPk(keyId);
      if (!keyToRemove) {
        return res.status(404).json({ error: "Key not found" });
      }

      // Check if key belongs to this order
      if (keyToRemove.assignedToOrderId !== parseInt(id)) {
        return res.status(400).json({ error: "Key does not belong to this order" });
      }

      await keyToRemove.destroy();

      // Return updated order with all relationships for immediate UI update
      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });

      res.json({
        message: "Key removed successfully",
        order: updatedOrder,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get all keys (admin)
router.get(
  "/keys",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const keys = await DigitalKey.findAll({
        include: [
          { model: Product, as: "product" },
          { model: Order, as: "order", include: [{ model: User, as: "user" }] }
        ]
      });
      res.json(keys);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
