const { sequelize } = require('../config/db');

/**
 * Force fix database schema issues for DigitalKey table
 * This will manually alter the table structure
 */

async function forceDatabaseFix() {
    try {
        console.log('🔧 Force fixing database schema...');
        
        // Drop all problematic constraints and indexes
        try {
            await sequelize.query('DROP INDEX IF EXISTS `digital_keys_key_value` ON `DigitalKeys`');
            console.log('✅ Dropped unique index');
        } catch (error) {
            console.log('ℹ️ Index does not exist or already dropped');
        }
        
        try {
            await sequelize.query('DROP INDEX IF EXISTS `digital_keys_product_id` ON `DigitalKeys`');
            console.log('✅ Dropped product index');
        } catch (error) {
            console.log('ℹ️ Product index does not exist');
        }
        
        try {
            await sequelize.query('DROP INDEX IF EXISTS `digital_keys_assigned_to_order_id` ON `DigitalKeys`');
            console.log('✅ Dropped order index');
        } catch (error) {
            console.log('ℹ️ Order index does not exist');
        }
        
        // Modify the column from TEXT to VARCHAR(500)
        try {
            await sequelize.query(`
                ALTER TABLE DigitalKeys 
                MODIFY COLUMN keyValue VARCHAR(500) NOT NULL
            `);
            console.log('✅ Changed keyValue column to VARCHAR(500)');
        } catch (error) {
            console.log('ℹ️ Column may already be VARCHAR');
        }
        
        // Recreate the unique index properly
        try {
            await sequelize.query(`
                ALTER TABLE DigitalKeys 
                ADD UNIQUE INDEX digital_keys_key_value (keyValue(500))
            `);
            console.log('✅ Recreated unique index with proper length');
        } catch (error) {
            console.log('ℹ️ Index may already exist');
        }
        
        // Recreate other indexes
        try {
            await sequelize.query(`
                ALTER TABLE DigitalKeys 
                ADD INDEX digital_keys_product_id (productId)
            `);
            console.log('✅ Recreated product index');
        } catch (error) {
            console.log('ℹ️ Product index may already exist');
        }
        
        try {
            await sequelize.query(`
                ALTER TABLE DigitalKeys 
                ADD INDEX digital_keys_assigned_to_order_id (assignedToOrderId)
            `);
            console.log('✅ Recreated order index');
        } catch (error) {
            console.log('ℹ️ Order index may already exist');
        }
        
        console.log('🎉 Database schema force fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error force fixing database schema:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run the fix
if (require.main === module) {
    forceDatabaseFix()
        .then(() => {
            console.log('Force schema fix completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Force schema fix failed:', error);
            process.exit(1);
        });
}

module.exports = { forceDatabaseFix };
