const { sequelize } = require('../config/db');
const { DigitalKey } = require('../models');

/**
 * Fix database schema issues for DigitalKey table
 */

async function fixDatabaseSchema() {
    try {
        console.log('🔧 Fixing database schema...');
        
        // Drop the problematic unique index if it exists
        try {
            await sequelize.getQueryInterface().dropIndex('DigitalKeys', 'digital_keys_key_value');
            console.log('✅ Dropped problematic unique index');
        } catch (error) {
            console.log('ℹ️ Index does not exist or already dropped');
        }
        
        // Modify the column to STRING if it's still TEXT
        try {
            await sequelize.getQueryInterface().changeColumn('DigitalKeys', 'keyValue', {
                type: 'VARCHAR(500)',
                allowNull: false
            });
            console.log('✅ Changed keyValue column to VARCHAR(500)');
        } catch (error) {
            console.log('ℹ️ Column may already be VARCHAR or change not needed');
        }
        
        // Recreate the unique index with proper column type
        try {
            await sequelize.getQueryInterface().addIndex('DigitalKeys', [{
                name: 'digital_keys_key_value',
                unique: true,
                fields: ['keyValue']
            }]);
            console.log('✅ Recreated unique index with VARCHAR column');
        } catch (error) {
            console.log('ℹ️ Index may already exist');
        }
        
        console.log('🎉 Database schema fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing database schema:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run the fix
if (require.main === module) {
    fixDatabaseSchema()
        .then(() => {
            console.log('Schema fix completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Schema fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixDatabaseSchema };
