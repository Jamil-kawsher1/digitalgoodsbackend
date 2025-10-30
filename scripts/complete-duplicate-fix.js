const { sequelize } = require('../models');
const { DigitalKey, Order, Product } = require('../models');

/**
 * Complete Duplicate Keys Fix Script
 * This script will completely reset and fix the duplicate keys issue
 */

async function completeDuplicateFix() {
    console.log('🔧 Starting complete duplicate keys fix...');
    
    try {
        // Step 1: Get current database state
        console.log('📊 Analyzing current database state...');
        
        const allKeys = await DigitalKey.findAll({
            include: [
                { model: Product, as: 'product' },
                { model: Order, as: 'order' }
            ]
        });
        
        console.log(`Found ${allKeys.length} total keys`);
        
        // Step 2: Find and group duplicates
        const keyGroups = {};
        allKeys.forEach(key => {
            const keyValue = key.keyValue;
            if (!keyGroups[keyValue]) {
                keyGroups[keyValue] = [];
            }
            keyGroups[keyValue].push(key);
        });
        
        const duplicateGroups = Object.entries(keyGroups).filter(([key, keys]) => keys.length > 1);
        console.log(`Found ${duplicateGroups.length} duplicate key groups`);
        
        if (duplicateGroups.length === 0) {
            console.log('✅ No duplicates found. Database is clean.');
            return;
        }
        
        // Step 3: Process each duplicate group
        console.log('🔄 Processing duplicate groups...');
        
        for (const [keyValue, duplicateKeys] of duplicateGroups) {
            console.log(`\nProcessing duplicate group: ${keyValue} (${duplicateKeys.length} instances)`);
            
            // Find the one that should be kept (prefer one assigned to an order, or the oldest)
            let keyToKeep = duplicateKeys.find(k => k.isAssigned && k.assignedToOrderId);
            
            if (!keyToKeep) {
                // If none are assigned, keep the oldest one
                keyToKeep = duplicateKeys.sort((a, b) => 
                    new Date(a.createdAt) - new Date(b.createdAt)
                )[0];
            }
            
            console.log(`Keeping key ID: ${keyToKeep.id} (created: ${keyToKeep.createdAt})`);
            
            // Delete the others
            const keysToDelete = duplicateKeys.filter(k => k.id !== keyToKeep.id);
            console.log(`Deleting ${keysToDelete.length} duplicate keys...`);
            
            for (const keyToDelete of keysToDelete) {
                console.log(`  - Deleting key ID: ${keyToDelete.id}`);
                await keyToDelete.destroy();
            }
        }
        
        // Step 4: Verify no orphans
        console.log('\n🔍 Checking for orphaned keys...');
        const orphanedKeys = await DigitalKey.findAll({
            where: {
                isAssigned: true,
                assignedToOrderId: null
            }
        });
        
        if (orphanedKeys.length > 0) {
            console.log(`Found ${orphanedKeys.length} orphaned keys, fixing...`);
            for (const orphan of orphanedKeys) {
                orphan.isAssigned = false;
                await orphan.save();
                console.log(`  - Fixed orphaned key: ${orphan.keyValue}`);
            }
        }
        
        // Step 5: Verify consistency
        console.log('\n✅ Verifying final consistency...');
        const finalKeys = await DigitalKey.findAll({
            include: [
                { model: Product, as: 'product' },
                { model: Order, as: 'order' }
            ]
        });
        
        const finalKeyValues = finalKeys.map(k => k.keyValue);
        const finalUniqueKeys = new Set(finalKeyValues);
        
        if (finalKeyValues.length !== finalUniqueKeys.size) {
            console.log('❌ CRITICAL: Still have duplicates!');
            return;
        }
        
        const finalOrphans = finalKeys.filter(k => 
            k.isAssigned && !k.assignedToOrderId
        );
        
        if (finalOrphans.length > 0) {
            console.log('❌ CRITICAL: Still have orphaned keys!');
            return;
        }
        
        // Step 6: Final statistics
        const assignedCount = finalKeys.filter(k => k.isAssigned).length;
        const availableCount = finalKeys.length - assignedCount;
        
        console.log('\n📈 Final Statistics:');
        console.log(`   Total keys: ${finalKeys.length}`);
        console.log(`   Assigned keys: ${assignedCount}`);
        console.log(`   Available keys: ${availableCount}`);
        console.log(`   Duplicate groups: 0`);
        console.log(`   Orphaned keys: 0`);
        
        console.log('\n🎉 Complete duplicate keys fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during complete duplicate fix:', error);
        throw error;
    }
}

// Run the complete fix
if (require.main === module) {
    completeDuplicateFix()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { completeDuplicateFix };
