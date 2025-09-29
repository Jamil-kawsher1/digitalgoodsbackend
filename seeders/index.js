const { sequelize } = require('../models');
const bcrypt = require('bcrypt');

// Import seed data
const userSeedData = require('./user-seeds');
const productSeedData = require('./product-seeds');
const digitalKeySeedData = require('./digitalkey-seeds');
const orderSeedData = require('./order-seeds');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Sync database (this will create tables if they don't exist)
    await sequelize.sync({ force: false });
    console.log('✅ Database synced');

    // Seed Users
    console.log('📝 Seeding Users...');
    for (const userData of userSeedData) {
      // Hash password before creating user
      if (userData.password) {
        userData.passwordHash = await bcrypt.hash(userData.password, 10);
        delete userData.password;
      }
      
      await sequelize.models.User.upsert(userData, {
        where: { email: userData.email }
      });
    }
    console.log(`✅ ${userSeedData.length} Users seeded`);

    // Seed Products
    console.log('📦 Seeding Products...');
    for (const productData of productSeedData) {
      await sequelize.models.Product.upsert(productData, {
        where: { id: productData.id }
      });
    }
    console.log(`✅ ${productSeedData.length} Products seeded`);

    // Seed Digital Keys
    console.log('🔑 Seeding Digital Keys...');
    for (const keyData of digitalKeySeedData) {
      await sequelize.models.DigitalKey.upsert(keyData, {
        where: { id: keyData.id }
      });
    }
    console.log(`✅ ${digitalKeySeedData.length} Digital Keys seeded`);

    // Seed Orders
    console.log('🛒 Seeding Orders...');
    for (const orderData of orderSeedData) {
      await sequelize.models.Order.upsert(orderData, {
        where: { id: orderData.id }
      });
    }
    console.log(`✅ ${orderSeedData.length} Orders seeded`);

    console.log('🎉 Database seeding completed successfully!');
    
    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   Users: ${userSeedData.length}`);
    console.log(`   Products: ${productSeedData.length}`);
    console.log(`   Digital Keys: ${digitalKeySeedData.length}`);
    console.log(`   Orders: ${orderSeedData.length}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n👋 Seeding process finished. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
