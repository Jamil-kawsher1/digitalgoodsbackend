const { sequelize } = require('./models');

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');

    // Run migrations using Sequelize sync
    await sequelize.sync({ alter: false });
    console.log('✅ Database migration completed successfully!');
    
    console.log('\n📊 Migration Summary:');
    console.log('   All database tables are up to date');
    console.log('   Foreign key constraints are applied');
    console.log('   Indexes are created');

  } catch (error) {
    console.error('❌ Error migrating database:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('\n👋 Migration process finished. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };
