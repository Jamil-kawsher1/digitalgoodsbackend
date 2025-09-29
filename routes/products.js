const express = require("express");
const { Product, DigitalKey, sequelize } = require("../models");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: ['id', 'name', 'description', 'price', 'quantity', 'logo', 'isActive'],
      include: [
        { model: DigitalKey, as: "keys" }
      ]
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create product
router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, instructions, price, quantity, logo } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const product = await Product.create({
      name,
      description,
      instructions,
      price,
      quantity: quantity || 0,
      logo,
      isActive: true
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update product
router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, instructions, price, quantity, logo, isActive } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await product.update({
      name: name || product.name,
      description: description || product.description,
      instructions: instructions || product.instructions,
      price: price || product.price,
      quantity: quantity !== undefined ? quantity : product.quantity,
      logo: logo || product.logo,
      isActive: isActive !== undefined ? isActive : product.isActive
    });

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product
router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    await product.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin route: Add digital keys to product
router.post(
  "/:id/keys",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { keys = [] } = req.body;
      const p = await Product.findByPk(id);
      if (!p) return res.status(404).json({ error: "Product not found" });
      const created = [];
      for (const k of keys) {
        const dk = await DigitalKey.create({
          keyValue: k,
          productId: p.id,
          isAssigned: false,
        });
        created.push(dk);
      }
      res.json({ message: "Keys added", keys: created });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get keys for product (admin)
router.get(
  "/:id/keys",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const keys = await DigitalKey.findAll({ where: { productId: id } });
      res.json(keys);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
