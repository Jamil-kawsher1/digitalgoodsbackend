const { Sequelize } = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "digistore",
  process.env.DB_USER || "root",
  process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql", // or "postgres"
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    logging: false
  }
);

module.exports = sequelize;
