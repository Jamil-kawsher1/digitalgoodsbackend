// models/index.js
const sequelize = require("../config/db"); // your configured Sequelize instance
const User = require("./User");
const Product = require("./Product");
const Order = require("./Order");
const DigitalKey = require("./DigitalKey");

const models = { User, Product, Order, DigitalKey };

// run associations
// Object.values(models).forEach(model => {
//   if (typeof model.associate === "function") model.associate(models);
// });

module.exports = { ...models, sequelize };
