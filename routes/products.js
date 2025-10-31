const express = require("express");
const { Product, DigitalKey, sequelize } = require("../models");
const { authRequired, requireRole } = require("../middleware/roleAuth");
const autoAssignmentService = require("../services/autoAssignmentService");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: ['id', 'name', 'description', 'price', 'quantity', 'logo', 'isActive', 'discountPercentage', 'isDiscountActive'],
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
router.post("/", authRequired, requireRole(["admin", "super_admin"]), async (req, res) => {
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
router.put("/:id", authRequired, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      instructions, 
      price, 
      quantity, 
      logo, 
      isActive,
      originalPrice,
      discountPercentage,
      markupPercentage,
      isDiscountActive,
      percentagePricing
    } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update all fields including discount-related fields
    await product.update({
      name: name || product.name,
      description: description || product.description,
      instructions: instructions || product.instructions,
      price: price !== undefined ? price : product.price,
      originalPrice: originalPrice !== undefined ? originalPrice : product.originalPrice,
      discountPercentage: discountPercentage !== undefined ? discountPercentage : product.discountPercentage,
      markupPercentage: markupPercentage !== undefined ? markupPercentage : product.markupPercentage,
      isDiscountActive: isDiscountActive !== undefined ? isDiscountActive : product.isDiscountActive,
      percentagePricing: percentagePricing !== undefined ? percentagePricing : product.percentagePricing,
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
router.delete("/:id", authRequired, requireRole(["admin", "super_admin"]), async (req, res) => {
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
  requireRole(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { keys = [] } = req.body;
      const p = await Product.findByPk(id);
      if (!p) return res.status(404).json({ error: "Product not found" });
      
      const processed = [];
      for (const k of keys) {
        const trimmedKey = k.trim();
        // Try to find existing key first
        let digitalKey = await DigitalKey.findOne({ 
          where: { keyValue: trimmedKey }
        });
        
        if (digitalKey) {
          // Update existing key if it exists
          if (!digitalKey.productId) {
            digitalKey.productId = p.id;
          }
          await digitalKey.save();
          processed.push({ action: 'updated', key: digitalKey });
        } else {
          // Create new key if not found
          const dk = await DigitalKey.create({
            keyValue: trimmedKey,
            productId: p.id,
            isAssigned: false,
          });
          processed.push({ action: 'created', key: dk });
        }
      }
      
      res.json({ 
        message: "Keys processed successfully", 
        processed: processed,
        summary: {
          created: processed.filter(p => p.action === 'created').length,
          updated: processed.filter(p => p.action === 'updated').length,
          total: processed.length
        }
      });
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
  requireRole(["admin", "super_admin"]),
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

// Toggle auto-assignment for a product
router.put(
  "/:id/auto-assignment",
  authRequired,
  requireRole(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      
      const result = await autoAssignmentService.toggleProductAutoAssignment(
        parseInt(id), 
        enabled
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get products with auto-assignment status
router.get(
  "/auto-assignment/status",
  authRequired,
  requireRole(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const products = await autoAssignmentService.getProductsWithAutoAssignmentStatus();
      res.json(products);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get products with discount controls (admin)
router.get(
  "/discount-control",
  authRequired,
  requireRole(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const products = await Product.findAll({
        attributes: ['id', 'name', 'description', 'price', 'quantity', 'logo', 'isActive', 'discountPercentage', 'isDiscountActive'],
        order: [['name', 'ASC']]
      });
      res.json(products);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Update product discount
router.put(
  "/:id/discount",
  authRequired,
  requireRole(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { discountPercentage, isDiscountActive } = req.body;
      
      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Validate discount percentage
      if (discountPercentage !== undefined) {
        if (discountPercentage < -95 || discountPercentage > 200) {
          return res.status(400).json({ error: "Discount percentage must be between -95 and 200" });
        }
        product.discountPercentage = discountPercentage;
      }

      if (isDiscountActive !== undefined) {
        product.isDiscountActive = isDiscountActive;
      }

      await product.save();

      // Calculate final price
      const finalPrice = product.isDiscountActive && product.discountPercentage > 0 
        ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
        : product.price;

      res.json({
        product: {
          id: product.id,
          name: product.name,
          originalPrice: product.price,
          discountPercentage: product.discountPercentage,
          isDiscountActive: product.isDiscountActive,
          finalPrice: parseFloat(finalPrice)
        },
        message: "Product discount updated successfully"
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Bulk update product discounts
router.put(
  "/bulk-discount",
  authRequired,
  requireRole(["admin", "super_admin"]),
  async (req, res) => {
    try {
      const { productIds, discountPercentage, isActive } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: "Product IDs array is required" });
      }

      if (discountPercentage !== undefined && (discountPercentage < -95 || discountPercentage > 200)) {
        return res.status(400).json({ error: "Discount percentage must be between -95 and 200" });
      }

      const result = await Product.update(
        {
          discountPercentage: discountPercentage !== undefined ? discountPercentage : sequelize.literal('discountPercentage'),
          isDiscountActive: isActive !== undefined ? isActive : sequelize.literal('isDiscountActive')
        },
        {
          where: {
            id: productIds
          }
        }
      );

      res.json({
        updated: result[0], // Number of updated rows
        message: `Updated discount for ${result[0]} products`
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
