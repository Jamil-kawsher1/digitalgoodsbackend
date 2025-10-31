// models/index.js
const sequelize = require("../config/db"); // your configured Sequelize instance
const User = require("./User");
const Product = require("./Product");
const Order = require("./Order");
const DigitalKey = require("./DigitalKey");
const SystemConfig = require("./SystemConfig");
const Permission = require("./Permission");
const Refund = require("./Refund");
const PromoCodeInit = require("./PromoCode");

const PromoCode = PromoCodeInit(sequelize);

const models = { User, Product, Order, DigitalKey, SystemConfig, Permission, Refund, PromoCode };

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

  // SystemConfig associations (if needed)
  SystemConfig.belongsTo(User, { foreignKey: "updatedBy", as: "updater" });

  // Refund associations
  Refund.belongsTo(User, { foreignKey: "userId", as: "user" });
  Refund.belongsTo(Order, { foreignKey: "orderId", as: "order" });
  User.hasMany(Refund, { foreignKey: "userId", as: "refunds" });
  Order.hasMany(Refund, { foreignKey: "orderId", as: "refunds" });

  // PromoCode associations
  PromoCode.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  User.hasMany(PromoCode, { foreignKey: "createdBy", as: "promoCodes" });
};

setupAssociations();

module.exports = { ...models, sequelize };
