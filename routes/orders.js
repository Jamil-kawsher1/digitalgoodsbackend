const express = require("express");
const { Order, Product, DigitalKey, User, sequelize } = require("../models");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// Create order
router.post("/", authRequired, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findByPk(productId);
    if (!product) return res.status(400).json({ error: "Product not found" });
    if (product.quantity <= 0)
      return res.status(400).json({ error: "Out of stock" });

    product.quantity -= 1;
    await product.save();

    const order = await Order.create({ userId: req.user.id, productId });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// List orders (admin -> all, user -> own)
// router.get("/", authRequired, async (req, res) => {
//   try {
//     if (req.user.role === "admin") {
//       const all = await Order.findAll({ include: [Product] });
//       return res.json(all);
//     }
//     const mine = await Order.findAll({
//       where: { userId: req.user.id },
//       include: [Product],
//     });
//     res.json(mine);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });


router.get("/", authRequired, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const all = await Order.findAll({
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });
      return res.json(all);
    }
    const mine = await Order.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Product, as: "product" },
        { model: DigitalKey, as: "keys" }
      ]
    });
    res.json(mine);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// Submit payment info for order
router.post("/:id/payment", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { method, trxId, sender } = req.body;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user.id)
      return res.status(403).json({ error: "Not yours" });

    order.paymentMethod = method;
    order.transactionId = trxId;
    order.paymentSender = sender;
    order.status = "awaiting_confirmation";
    await order.save();

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin confirm payment (no keys)
router.post(
  "/:id/confirm-payment",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = "paid";
      await order.save();

      res.json({
        message: "Payment confirmed. Keys/details will be assigned soon.",
        order,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Admin marks paid and assign keys
router.post(
  "/:id/mark-paid",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { keys = [] } = req.body;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = "paid";
      await order.save();

      for (let key of keys) {
        await DigitalKey.create({
          keyValue: key,
          productId: order.productId,
          isAssigned: true,
          assignedToOrderId: order.id,
        });
      }

      res.json(order);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Admin assign keys separately
router.post(
  "/:id/assign-keys",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { keys = [] } = req.body;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (order.status !== "paid") {
        return res.status(400).json({
          error: "Order must be marked as paid before assigning keys.",
        });
      }

      const savedKeys = [];
      for (const key of keys) {
        const dk = await DigitalKey.create({
          keyValue: key,
          productId: order.productId,
          isAssigned: true,
          assignedToOrderId: order.id,
        });
        savedKeys.push(dk);
      }

      const updated = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: DigitalKey, as: "keys" },
          { model: User, as: "user", attributes: ["id", "name", "email"] },
        ],
      });

      res.json({ message: "Keys assigned successfully", order: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
