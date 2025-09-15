// migrations/2025xxxxxxxxxx-add-user-name-email-confirmation.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // add columns if they don't exist
    await queryInterface.addColumn("Users", "name", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "emailConfirmed", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("Users", "confirmationCode", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "confirmationCodeExpires", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Users", "confirmationCodeExpires");
    await queryInterface.removeColumn("Users", "confirmationCode");
    await queryInterface.removeColumn("Users", "emailConfirmed");
    await queryInterface.removeColumn("Users", "name");
  },
};
