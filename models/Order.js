const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
  status: {
    type: DataTypes.ENUM("pending", "awaiting_confirmation", "paid", "delivered", "cancelled"),
    defaultValue: "pending"
  },
  paymentMethod: { type: DataTypes.STRING },
  transactionId: { type: DataTypes.STRING },
  paymentSender: { type: DataTypes.STRING }
}, { timestamps: true });

module.exports = Order;
