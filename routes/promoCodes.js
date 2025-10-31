const express = require('express');
const router = express.Router();
const { PromoCode, User } = require('../models');
const { authRequired, requireRole } = require('../middleware/roleAuth');
const { body, validationResult, param } = require('express-validator');

// Middleware to validate request
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Get all promo codes (admin only)
router.get('/', authRequired, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const promoCodes = await PromoCode.findAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(promoCodes);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

// Get promo code by ID (admin only)
router.get('/:id', authRequired, requireRole(['admin', 'super_admin']), [
  param('id').isInt().withMessage('ID must be an integer')
], handleValidationErrors, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    res.json(promoCode);
  } catch (error) {
    console.error('Error fetching promo code:', error);
    res.status(500).json({ error: 'Failed to fetch promo code' });
  }
});

// Validate promo code (public endpoint for checkout)
router.post('/validate', [
  body('code').trim().isLength({ min: 3, max: 50 }).withMessage('Code must be 3-50 characters'),
  body('orderAmount').optional().isFloat({ min: 0 }).withMessage('Order amount must be positive'),
  body('productIds').optional().isArray().withMessage('Product IDs must be an array'),
  body('categories').optional().isArray().withMessage('Categories must be an array')
], handleValidationErrors, async (req, res) => {
  try {
    const { code, orderAmount = 0, productIds = [], categories = [] } = req.body;

    // Find promo code
    const promoCode = await PromoCode.findValidByCode(code);

    if (!promoCode) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid or expired promo code'
      });
    }

    // Check minimum order amount
    if (promoCode.minOrderAmount && orderAmount < promoCode.minOrderAmount) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order amount of $${promoCode.minOrderAmount} required`,
        minOrderAmount: promoCode.minOrderAmount
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'percentage') {
      discountAmount = (orderAmount * promoCode.discountValue) / 100;
    } else {
      discountAmount = promoCode.discountValue;
    }

    // Apply maximum discount limit
    if (promoCode.maxDiscountAmount && discountAmount > promoCode.maxDiscountAmount) {
      discountAmount = promoCode.maxDiscountAmount;
    }

    // Check product/category restrictions
    let isApplicable = true;
    if (promoCode.applicableProducts && promoCode.applicableProducts.length > 0) {
      isApplicable = productIds.some(id => promoCode.applicableProducts.includes(id));
    }

    if (isApplicable && promoCode.applicableCategories && promoCode.applicableCategories.length > 0) {
      isApplicable = categories.some(category => promoCode.applicableCategories.includes(category));
    }

    if (!isApplicable) {
      return res.status(400).json({
        valid: false,
        error: 'Promo code not applicable to these products'
      });
    }

    res.json({
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: discountAmount,
        minOrderAmount: promoCode.minOrderAmount,
        maxDiscountAmount: promoCode.maxDiscountAmount
      }
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({ error: 'Failed to validate promo code' });
  }
});

// Create new promo code (admin only)
router.post('/', authRequired, requireRole(['admin', 'super_admin']), [
  body('code').trim().isLength({ min: 3, max: 50 }).withMessage('Code must be 3-50 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('Min order amount must be positive'),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }).withMessage('Max discount amount must be positive'),
  body('usageLimit').optional().isInt({ min: 1 }).withMessage('Usage limit must be positive integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('applicableProducts').optional().isArray().withMessage('Applicable products must be array'),
  body('applicableCategories').optional().isArray().withMessage('Applicable categories must be array')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      isActive = true,
      startDate,
      endDate,
      applicableProducts,
      applicableCategories
    } = req.body;

    // Check if promo code already exists
    const existingPromo = await PromoCode.findByCode(code);
    if (existingPromo) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }

    // Validate percentage discount
    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const promoCode = await PromoCode.create({
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      isActive,
      startDate: startDate || null,
      endDate: endDate || null,
      applicableProducts,
      applicableCategories,
      createdBy: req.user.id
    });

    // Return created promo code with creator info
    const createdPromo = await PromoCode.findByPk(promoCode.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json(createdPromo);
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// Update promo code (admin only)
router.put('/:id', authRequired, requireRole(['admin', 'super_admin']), [
  param('id').isInt().withMessage('ID must be an integer'),
  body('code').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Code must be 3-50 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('discountType').optional().isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('Discount value must be positive'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('Min order amount must be positive'),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }).withMessage('Max discount amount must be positive'),
  body('usageLimit').optional().isInt({ min: 1 }).withMessage('Usage limit must be positive integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('applicableProducts').optional().isArray().withMessage('Applicable products must be array'),
  body('applicableCategories').optional().isArray().withMessage('Applicable categories must be array')
], handleValidationErrors, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByPk(req.params.id);

    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    const updates = req.body;

    // Check if new code conflicts with existing promo code
    if (updates.code && updates.code !== promoCode.code) {
      const existingPromo = await PromoCode.findByCode(updates.code);
      if (existingPromo) {
        return res.status(400).json({ error: 'Promo code already exists' });
      }
    }

    // Validate percentage discount
    if (updates.discountType === 'percentage' && updates.discountValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    // Validate date range
    const startDate = updates.startDate || promoCode.startDate;
    const endDate = updates.endDate || promoCode.endDate;
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    await promoCode.update(updates);

    // Return updated promo code with creator info
    const updatedPromo = await PromoCode.findByPk(promoCode.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedPromo);
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

// Delete promo code (admin only)
router.delete('/:id', authRequired, requireRole(['admin', 'super_admin']), [
  param('id').isInt().withMessage('ID must be an integer')
], handleValidationErrors, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByPk(req.params.id);

    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    await promoCode.destroy();

    res.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

// Increment promo code usage (internal use)
router.post('/:id/use', authRequired, [
  param('id').isInt().withMessage('ID must be an integer')
], handleValidationErrors, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByPk(req.params.id);

    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    if (!promoCode.isValid()) {
      return res.status(400).json({ error: 'Promo code is not valid' });
    }

    await promoCode.incrementUsage();

    res.json({ message: 'Promo code usage incremented successfully' });
  } catch (error) {
    console.error('Error incrementing promo code usage:', error);
    res.status(500).json({ error: 'Failed to increment promo code usage' });
  }
});

module.exports = router;
