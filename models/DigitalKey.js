const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DigitalKey = sequelize.define("DigitalKey", {
  keyValue: { type: DataTypes.TEXT, allowNull: false },
  isAssigned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

module.exports = DigitalKey;
