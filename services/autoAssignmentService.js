const { Order, DigitalKey, Product, sequelize } = require('../models');

/**
 * Auto-Assignment Service for Digital Keys
 * Automatically assigns available keys to paid orders
 */
class AutoAssignmentService {
  constructor() {
    this.isEnabled = false;
    this.assignmentQueue = new Map(); // Handle concurrent assignments
  }

  /**
   * Enable or disable auto-assignment
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`Auto-assignment ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if auto-assignment is enabled
   */
  isEnabledStatus() {
    return this.isEnabled;
  }

  /**
   * Find and assign the first available key for a product
   * @param {number} productId - The product ID to find keys for
   * @param {number} orderId - The order ID to assign the key to
   * @returns {Promise<Object>} Result with success status and assigned key or error
   */
  async assignAvailableKey(productId, orderId) {
    if (!this.isEnabled) {
      return { success: false, message: 'Auto-assignment is disabled' };
    }

    // Prevent concurrent assignments for the same order
    if (this.assignmentQueue.has(orderId)) {
      return { success: false, message: 'Assignment already in progress for this order' };
    }

    this.assignmentQueue.set(orderId, true);

    try {
      const transaction = await sequelize.transaction();

      try {
        // Find the first available key for the product
        const availableKey = await DigitalKey.findOne({
          where: {
            productId: productId,
            isAssigned: false
          },
          lock: transaction.LOCK.UPDATE,
          order: [['createdAt', 'ASC']] // FIFO approach
        });

        if (!availableKey) {
          await transaction.rollback();
          return { 
            success: false, 
            message: 'No available keys found for this product',
            productId,
            orderId
          };
        }

        // Mark key as assigned
        await availableKey.update({
          isAssigned: true,
          assignedToOrderId: orderId,
          assignedAt: new Date()
        }, { transaction });

        await transaction.commit();

        console.log(`Auto-assigned key ${availableKey.keyValue} to order ${orderId} for product ${productId}`);

        return {
          success: true,
          message: 'Key automatically assigned',
          key: availableKey,
          orderId,
          productId
        };

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Auto-assignment failed:', error);
      return {
        success: false,
        message: 'Auto-assignment failed: ' + error.message,
        error: error.message
      };
    } finally {
      // Remove from queue
      this.assignmentQueue.delete(orderId);
    }
  }

  /**
   * Auto-assign keys for multiple orders (bulk operation)
   * @param {Array} orders - Array of order objects
   * @returns {Promise<Array>} Results array
   */
  async bulkAssign(orders) {
    if (!this.isEnabled) {
      return orders.map(order => ({
        orderId: order.id,
        success: false,
        message: 'Auto-assignment is disabled'
      }));
    }

    const results = [];
    
    for (const order of orders) {
      if (order.status === 'paid' && (!order.keys || order.keys.length === 0)) {
        const result = await this.assignAvailableKey(order.productId, order.id);
        results.push({
          orderId: order.id,
          ...result
        });
      } else {
        results.push({
          orderId: order.id,
          success: false,
          message: order.status !== 'paid' ? 'Order is not paid' : 'Order already has keys'
        });
      }
    }

    return results;
  }

  /**
   * Get available keys count for a product
   * @param {number} productId - Product ID
   * @returns {Promise<number>} Count of available keys
   */
  async getAvailableKeysCount(productId) {
    return await DigitalKey.count({
      where: {
        productId: productId,
        isAssigned: false
      }
    });
  }

  /**
   * Check if a product has available keys
   * @param {number} productId - Product ID
   * @returns {Promise<boolean>} True if keys are available
   */
  async hasAvailableKeys(productId) {
    const count = await this.getAvailableKeysCount(productId);
    return count > 0;
  }

  /**
   * Get statistics for auto-assignment
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    const totalKeys = await DigitalKey.count();
    const assignedKeys = await DigitalKey.count({
      where: { isAssigned: true }
    });
    const availableKeys = totalKeys - assignedKeys;

    return {
      enabled: this.isEnabled,
      totalKeys,
      assignedKeys,
      availableKeys,
      assignmentQueue: this.assignmentQueue.size
    };
  }

  /**
   * Handle order status change - trigger auto-assignment if needed
   * @param {number} orderId - Order ID
   * @param {string} newStatus - New order status
   * @returns {Promise<Object>} Assignment result
   */
  async handleOrderStatusChange(orderId, newStatus) {
    if (!this.isEnabled || newStatus !== 'paid') {
      return { success: false, message: 'Auto-assignment not triggered' };
    }

    try {
      // Get order details
      const order = await Order.findByPk(orderId, {
        include: [
          { model: DigitalKey, as: 'keys' }
        ]
      });

      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Check if order already has keys
      if (order.keys && order.keys.length > 0) {
        return { success: false, message: 'Order already has keys assigned' };
      }

      // Auto-assign key
      return await this.assignAvailableKey(order.productId, orderId);

    } catch (error) {
      console.error('Error handling order status change:', error);
      return {
        success: false,
        message: 'Error handling status change: ' + error.message
      };
    }
  }

  /**
   * Release a key back to available pool
   * @param {number} keyId - Key ID to release
   * @returns {Promise<Object>} Result
   */
  async releaseKey(keyId) {
    try {
      const key = await DigitalKey.findByPk(keyId);
      
      if (!key) {
        return { success: false, message: 'Key not found' };
      }

      if (!key.isAssigned) {
        return { success: false, message: 'Key is already available' };
      }

      await key.update({
        isAssigned: false,
        assignedToOrderId: null,
        assignedAt: null
      });

      console.log(`Released key ${key.keyValue} back to available pool`);

      return {
        success: true,
        message: 'Key released successfully',
        key
      };

    } catch (error) {
      console.error('Error releasing key:', error);
      return {
        success: false,
        message: 'Error releasing key: ' + error.message
      };
    }
  }
}

// Create singleton instance
const autoAssignmentService = new AutoAssignmentService();

module.exports = autoAssignmentService;
