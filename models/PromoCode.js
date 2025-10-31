const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromoCode = sequelize.define('PromoCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100 // For percentage discounts
      }
    },
    minOrderAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null
    },
    maxDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      validate: {
        min: 1
      }
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    applicableProducts: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    applicableCategories: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'promo_codes',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['code']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['endDate']
      }
    ]
  });

  // Instance methods
  PromoCode.prototype.isValid = function() {
    const now = new Date();
    
    // Check if promo code is active
    if (!this.isActive) {
      return false;
    }
    
    // Check start date
    if (this.startDate && new Date(this.startDate) > now) {
      return false;
    }
    
    // Check end date
    if (this.endDate && new Date(this.endDate) < now) {
      return false;
    }
    
    // Check usage limit
    if (this.usageLimit && this.usageCount >= this.usageLimit) {
      return false;
    }
    
    return true;
  };

  PromoCode.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    await this.save();
  };

  // Class methods
  PromoCode.findByCode = async function(code) {
    return await this.findOne({
      where: { code: code.toUpperCase() }
    });
  };

  PromoCode.findValidByCode = async function(code) {
    const promo = await this.findByCode(code);
    return promo && promo.isValid() ? promo : null;
  };

  // Hooks
  PromoCode.beforeCreate(async (promo) => {
    // Convert code to uppercase
    if (promo.code) {
      promo.code = promo.code.toUpperCase();
    }
  });

  PromoCode.beforeUpdate(async (promo) => {
    // Convert code to uppercase
    if (promo.changed('code') && promo.code) {
      promo.code = promo.code.toUpperCase();
    }
  });

  return PromoCode;
};
