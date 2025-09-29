// models/index.js
const sequelize = require("../config/db"); // your configured Sequelize instance
const User = require("./User");
const Product = require("./Product");
const Order = require("./Order");
const DigitalKey = require("./DigitalKey");

const models = { User, Product, Order, DigitalKey };

// Define associations
const setupAssociations = () => {
  // User associations
  User.hasMany(Order, { foreignKey: "userId", as: "orders" });
  Order.belongsTo(User, { foreignKey: "userId", as: "user" });

  // Product associations
  Product.hasMany(Order, { foreignKey: "productId", as: "orders" });
  Order.belongsTo(Product, { foreignKey: "productId", as: "product" });

  // DigitalKey associations
  Product.hasMany(DigitalKey, { foreignKey: "productId", as: "keys" });
  DigitalKey.belongsTo(Product, { foreignKey: "productId", as: "product" });

  Order.hasMany(DigitalKey, { foreignKey: "assignedToOrderId", as: "keys" });
  DigitalKey.belongsTo(Order, { foreignKey: "assignedToOrderId", as: "order" });
};

setupAssociations();

module.exports = { ...models, sequelize };
