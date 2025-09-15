const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("./Product");
const Order = require("./Order");

const DigitalKey = sequelize.define("DigitalKey", {
  keyValue: { type: DataTypes.TEXT, allowNull: false },
  isAssigned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

Product.hasMany(DigitalKey, { foreignKey: "productId" });
DigitalKey.belongsTo(Product, { foreignKey: "productId" });

Order.hasMany(DigitalKey, { foreignKey: "assignedToOrderId" });
DigitalKey.belongsTo(Order, { foreignKey: "assignedToOrderId" });

module.exports = DigitalKey;
