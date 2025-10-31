const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Permission = sequelize.define("Permission", {
  feature: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  role: { 
    type: DataTypes.ENUM('super_admin', 'admin', 'user'),
    allowNull: false 
  },
  canAccess: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, { 
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['feature', 'role']
    }
  ]
});

module.exports = Permission;
