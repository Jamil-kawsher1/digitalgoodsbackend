const { DigitalKey, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Script to fix duplicate keys and update database schema
 * This script:
 * 1. Finds and removes duplicate keys (keeping the first occurrence)
 * 2. Updates missing productId and assignedToOrderId fields
 */

async function fixDuplicateKeys() {
  console.log('🔧 Starting duplicate keys fix...');
  
  try {
    // Find all duplicate keys
    const duplicateKeys = await DigitalKey.findAll({
      attributes: [
        'keyValue',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['keyValue'],
      having: sequelize.where(sequelize.fn('COUNT', sequelize.col('id')), '>', 1)
    });

    console.log(`📊 Found ${duplicateKeys.length} duplicate key groups`);

    // Process each duplicate group
    for (const duplicate of duplicateKeys) {
      const keyValue = duplicate.keyValue;
      console.log(`🔄 Processing duplicate key: ${keyValue}`);

      // Find all instances of this key
      const allInstances = await DigitalKey.findAll({
        where: { keyValue },
        order: [['id', 'ASC']]
      });

      // Keep the first one, mark others for deletion
      const toKeep = allInstances[0];
      const toDelete = allInstances.slice(1);

      console.log(`   Keeping key ID: ${toKeep.id}`);
      console.log(`   Deleting ${toDelete.length} duplicate instances`);

      // Update the kept key with any missing info from duplicates
      for (const duplicate of toDelete) {
        if (duplicate.productId && !toKeep.productId) {
          toKeep.productId = duplicate.productId;
        }
        if (duplicate.assignedToOrderId && !toKeep.assignedToOrderId) {
          toKeep.assignedToOrderId = duplicate.assignedToOrderId;
          toKeep.isAssigned = true;
        }
      }

      await toKeep.save();

      // Delete duplicates
      for (const duplicate of toDelete) {
        await duplicate.destroy();
      }

      console.log(`   ✅ Fixed duplicate key: ${keyValue}`);
    }

    // Update keys missing productId
    const keysWithoutProduct = await DigitalKey.findAll({
      where: {
        productId: { [Op.is]: null }
      }
    });

    console.log(`📝 Found ${keysWithoutProduct.length} keys without productId`);

    // For demonstration, set productId to 1 (Microsoft Office 2024 Professional)
    // In a real scenario, you'd need to determine the correct product
    for (const key of keysWithoutProduct) {
      key.productId = 1; // Default to first product
      await key.save();
      console.log(`   Updated key ${key.keyValue} with productId: 1`);
    }

    console.log('✅ Duplicate keys fix completed successfully!');
    
    // Show final statistics
    const totalKeys = await DigitalKey.count();
    const assignedKeys = await DigitalKey.count({ where: { isAssigned: true } });
    const availableKeys = totalKeys - assignedKeys;

    console.log('📈 Final Statistics:');
    console.log(`   Total keys: ${totalKeys}`);
    console.log(`   Assigned keys: ${assignedKeys}`);
    console.log(`   Available keys: ${availableKeys}`);

  } catch (error) {
    console.error('❌ Error fixing duplicate keys:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixDuplicateKeys()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDuplicateKeys };
