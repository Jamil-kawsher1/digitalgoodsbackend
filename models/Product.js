const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define("Product", {
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT,
    allowNull: true 
  },
  instructions: { 
    type: DataTypes.TEXT,
    allowNull: true 
  },
  price: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  quantity: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  },
  logo: { 
    type: DataTypes.TEXT 
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  }
}, { 
  timestamps: true 
});

module.exports = Product;
