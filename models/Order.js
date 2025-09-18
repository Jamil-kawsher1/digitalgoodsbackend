const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");
const Product = require("./Product");

const Order = sequelize.define("Order", {
  status: {
    type: DataTypes.ENUM("pending", "awaiting_confirmation", "paid", "delivered", "cancelled"),
    defaultValue: "pending"
  },
  paymentMethod: { type: DataTypes.STRING },
  transactionId: { type: DataTypes.STRING },
  paymentSender: { type: DataTypes.STRING }
}, { timestamps: true });

//old v .still works
// User.hasMany(Order, { foreignKey: "userId" });
// Order.belongsTo(User, { foreignKey: "userId" });

// Product.hasMany(Order, { foreignKey: "productId" });
// Order.belongsTo(Product, { foreignKey: "productId" });



//new version

User.hasMany(Order, { foreignKey: "userId", as: "orders" });
Order.belongsTo(User, { foreignKey: "userId", as: "user" });

Product.hasMany(Order, { foreignKey: "productId", as: "orders" });
Order.belongsTo(Product, { foreignKey: "productId", as: "product" });
module.exports = Order;
