const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DigitalKey = sequelize.define("DigitalKey", {
  keyValue: { 
    type: DataTypes.STRING(500), 
    allowNull: false,
    unique: true 
  },
  isAssigned: { type: DataTypes.BOOLEAN, defaultValue: false },
  productId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: 'Product',
      key: 'id'
    }
  },
  assignedToOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Order',
      key: 'id'
    }
  }
}, { 
  timestamps: true,
  indexes: [
    {
      fields: ['productId']
    },
    {
      fields: ['assignedToOrderId']
    }
  ]
});

module.exports = DigitalKey;
