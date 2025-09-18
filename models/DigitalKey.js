const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("./Product");
const Order = require("./Order");

const DigitalKey = sequelize.define("DigitalKey", {
  keyValue: { type: DataTypes.TEXT, allowNull: false },
  isAssigned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// Product.hasMany(DigitalKey, { foreignKey: "productId" });
// DigitalKey.belongsTo(Product, { foreignKey: "productId" });

// Order.hasMany(DigitalKey, { foreignKey: "assignedToOrderId" });
// DigitalKey.belongsTo(Order, { foreignKey: "assignedToOrderId" });


//new 

Product.hasMany(DigitalKey, { foreignKey: "productId", as: "keys" });
DigitalKey.belongsTo(Product, { foreignKey: "productId", as: "product" });

Order.hasMany(DigitalKey, { foreignKey: "assignedToOrderId", as: "keys" });
DigitalKey.belongsTo(Order, { foreignKey: "assignedToOrderId", as: "order" })

module.exports = DigitalKey;
