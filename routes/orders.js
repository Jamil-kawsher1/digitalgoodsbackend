const express = require("express");
const { Order, Product, DigitalKey, User, SystemConfig, sequelize } = require("../models");
const { authRequired, requireRole } = require("../middleware/roleAuth");
const autoAssignmentService = require("../services/autoAssignmentService");

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
router.get("/", authRequired, async (req, res) => {
  try {
    if (req.user.role === "admin" || req.user.role === "super_admin") {
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
    
    console.log("Payment submission received:", { id, method, trxId, sender });
    
    const order = await Order.findByPk(id, {
      include: [
        { model: Product, as: "product" },
        { model: User, as: "user" },
        { model: DigitalKey, as: "keys" }
      ]
    });
    
    if (!order) {
      console.log("Order not found:", id);
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.userId !== req.user.id) {
      console.log("Order access denied - user mismatch:", order.userId, req.user.id);
      return res.status(403).json({ error: "Not yours" });
    }

    console.log("Updating order payment info...");
    
    order.paymentMethod = method;
    order.transactionId = trxId;
    order.paymentSender = sender;
    order.status = "awaiting_confirmation";
    await order.save();

    console.log("Order updated successfully:", order.toJSON());

    // Return the updated order with all relationships
    const updatedOrder = await Order.findByPk(id, {
      include: [
        { model: Product, as: "product" },
        { model: User, as: "user" },
        { model: DigitalKey, as: "keys" }
      ]
    });

    res.json(updatedOrder);
  } catch (err) {
    console.error("Error in payment submission:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// Admin confirm payment (no keys)
router.post(
  "/:id/confirm-payment",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = "paid";
      await order.save();

      // Check if auto-assignment should trigger
      const autoAssignEnabled = await SystemConfig.getConfig('auto_assignment_enabled', false);
      const triggerOnPayment = await SystemConfig.getConfig('auto_assignment_trigger_on_payment', true);
      
      if (autoAssignEnabled && triggerOnPayment) {
        const result = await autoAssignmentService.handleOrderStatusChange(id, 'paid');
        if (result.success) {
          console.log("Auto-assignment triggered on payment confirmation");
        }
      }

      // Return updated order with all relationships for immediate UI update
      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });

      res.json({
        message: "Payment confirmed. Keys/details will be assigned soon.",
        order: updatedOrder,
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
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { keys = [] } = req.body;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = "paid";
      await order.save();

      const assignedKeys = [];
      for (let key of keys) {
        // Try to find existing key first
        let digitalKey = await DigitalKey.findOne({ 
          where: { keyValue: key.trim() }
        });
        
        if (digitalKey) {
          // Update existing key
          digitalKey.isAssigned = true;
          digitalKey.assignedToOrderId = order.id;
          await digitalKey.save();
        } else {
          // Create new key if not found
          digitalKey = await DigitalKey.create({
            keyValue: key.trim(),
            productId: order.productId,
            isAssigned: true,
            assignedToOrderId: order.id,
          });
        }
        assignedKeys.push(digitalKey);
      }

      // Return updated order with all relationships for immediate UI update
      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });

      res.json({
        message: "Payment confirmed and keys assigned successfully!",
        order: updatedOrder,
        assignedKeys
      });
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
  requireRole(['admin', 'super_admin']),
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
        // Try to find existing key first
        let digitalKey = await DigitalKey.findOne({ 
          where: { keyValue: key.trim() }
        });
        
        if (digitalKey) {
          // Update existing key
          digitalKey.isAssigned = true;
          digitalKey.assignedToOrderId = order.id;
          await digitalKey.save();
        } else {
          // Create new key if not found
          digitalKey = await DigitalKey.create({
            keyValue: key.trim(),
            productId: order.productId,
            isAssigned: true,
            assignedToOrderId: order.id,
          });
        }
        savedKeys.push(digitalKey);
      }

      const updated = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: DigitalKey, as: "keys" },
          { model: User, as: "user", attributes: ["id", "name", "email"] },
        ],
      });

      res.json({ message: "Keys assigned successfully", order: updated, assignedKeys: savedKeys });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Admin update order status
router.post(
  "/:id/status",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      const oldStatus = order.status;
      order.status = status;
      await order.save();

      // Check if auto-assignment should trigger
      if (status === 'paid' && oldStatus !== 'paid') {
        const autoAssignEnabled = await SystemConfig.getConfig('auto_assignment_enabled', false);
        const triggerOnStatusChange = await SystemConfig.getConfig('auto_assignment_trigger_on_status_change', true);
        
        if (autoAssignEnabled && triggerOnStatusChange) {
          const result = await autoAssignmentService.handleOrderStatusChange(id, 'paid');
          if (result.success) {
            console.log("Auto-assignment triggered on status change");
          }
        }
      }

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
  requireRole(['admin', 'super_admin']),
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

      // Find and release key
      const keyToRemove = await DigitalKey.findByPk(keyId);
      if (!keyToRemove) {
        return res.status(404).json({ error: "Key not found" });
      }

      // Check if key belongs to this order
      if (keyToRemove.assignedToOrderId !== parseInt(id)) {
        return res.status(400).json({ error: "Key does not belong to this order" });
      }

      // Release key back to available pool instead of destroying it
      keyToRemove.isAssigned = false;
      keyToRemove.assignedToOrderId = null;
      await keyToRemove.save();

      // Return updated order with all relationships for immediate UI update
      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: Product, as: "product" },
          { model: User, as: "user" },
          { model: DigitalKey, as: "keys" }
        ]
      });

      res.json({
        message: "Key released and is now available for reassignment",
        order: updatedOrder,
        releasedKey: keyToRemove
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
  requireRole(['admin', 'super_admin']),
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

// Auto-assignment endpoints
router.get(
  "/auto-assignment/status",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const status = autoAssignmentService.isEnabledStatus();
      const statistics = await autoAssignmentService.getStatistics();
      res.json({
        enabled: status,
        statistics
      });
    } catch (err) {
      console.error("Error getting auto-assignment status:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/auto-assignment/toggle",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { enabled } = req.body;
      autoAssignmentService.setEnabled(enabled);
      
      // Save to database configuration
      await SystemConfig.setConfig('auto_assignment_enabled', enabled, req.user.id);
      
      res.json({
        message: `Auto-assignment ${enabled ? 'enabled' : 'disabled'}`,
        enabled
      });
    } catch (err) {
      console.error("Error toggling auto-assignment:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get(
  "/auto-assignment/config",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const configs = await SystemConfig.getAllConfigs('auto_assignment');
      res.json(configs);
    } catch (err) {
      console.error("Error getting configurations:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/auto-assignment/config/:key",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { key: configKey } = req.params;
      const { value } = req.body;
      
      await SystemConfig.setConfig(configKey, value, req.user.id);
      
      res.json({
        message: `Configuration ${configKey} updated successfully`,
        key: configKey,
        value
      });
    } catch (err) {
      console.error("Error updating configuration:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/auto-assignment/process/:orderId",
  authRequired,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await autoAssignmentService.assignAvailableKey(null, orderId);
      
      if (result.success) {
        // Return updated order with all relationships
        const updatedOrder = await Order.findByPk(orderId, {
          include: [
            { model: Product, as: "product" },
            { model: User, as: "user" },
            { model: DigitalKey, as: "keys" }
          ]
        });
        
        res.json({
          message: "Key auto-assigned successfully",
          order: updatedOrder,
          assignedKey: result.key
        });
      } else {
        res.json(result);
      }
    } catch (err) {
      console.error("Error processing auto-assignment:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
