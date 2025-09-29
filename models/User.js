const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    name: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    email: { 
      type: DataTypes.STRING, 
      unique: true, 
      allowNull: false 
    },
    passwordHash: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    role: {
      type: DataTypes.ENUM("admin", "customer"),
      defaultValue: "customer",
    },
    emailConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    confirmationCode: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    confirmationCodeExpires: { 
      type: DataTypes.DATE, 
      allowNull: true 
    }
  },
  { 
    timestamps: true,
    tableName: 'Users'
  }
);

module.exports = User;