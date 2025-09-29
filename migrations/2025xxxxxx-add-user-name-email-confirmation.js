'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add User model columns for email confirmation
    await queryInterface.addColumn('Users', 'name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'emailConfirmed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('Users', 'confirmationCode', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'confirmationCodeExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'confirmationCodeExpires');
    await queryInterface.removeColumn('Users', 'confirmationCode');
    await queryInterface.removeColumn('Users', 'emailConfirmed');
    await queryInterface.removeColumn('Users', 'name');
  }
};
