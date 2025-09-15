// const express = require("express");
// const Product = require("../models/Product");
// const { authRequired, requireRole } = require("../middleware/auth");

// const router = express.Router();

// router.get("/", async (req, res) => {
//   try {
//     const products = await Product.findAll();
//     res.json(products);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// router.post("/", authRequired, requireRole("admin"), async (req, res) => {
//   try {
//     const product = await Product.create(req.body);
//     res.json(product);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// module.exports = router;

//new code start here

const express = require("express");
const Product = require("../models/Product");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * Public route: Get safe product list
 * Shows only: id, name, price, logo, inStock (no quantity exposed)
 */
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll();
    const safeProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      logo: p.logo,
      inStock: p.quantity > 0,
    }));
    res.json(safeProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Admin route: Get full product details (with quantity, active status)
 */
router.get("/admin", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Admin route: Create new product
 */
router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { name, price, quantity, logo } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }
    const product = await Product.create({ name, price, quantity, logo });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Admin route: Update product (quantity, price, etc.)
 */
router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, quantity, logo, isActive } = req.body;
    const product = await Product.findByPk(id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.quantity = quantity ?? product.quantity;
    product.logo = logo ?? product.logo;
    product.isActive = isActive ?? product.isActive;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
