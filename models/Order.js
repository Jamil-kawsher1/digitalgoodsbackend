const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Product',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM("pending", "awaiting_confirmation", "paid", "delivered", "cancelled"),
    defaultValue: "pending"
  },
  paymentMethod: { type: DataTypes.STRING },
  transactionId: { type: DataTypes.STRING },
  paymentSender: { type: DataTypes.STRING }
}, { timestamps: true });

module.exports = Order;
