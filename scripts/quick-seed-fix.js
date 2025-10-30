const { sequelize } = require('../models');

/**
 * Quick seed fix - just seed digital keys without order references
 */

async function quickSeedFix() {
    try {
        console.log('🔧 Quick seed fix for digital keys...');
        
        // Only seed digital keys with no order references first
        const keySeedData = [
            {
                id: 2,
                keyValue: 'YYYYY-YYYYY-YYYYY-YYYYY-YYYYY',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 1,
                createdAt: new Date('2024-01-10'),
                updatedAt: new Date('2024-01-10')
            },
            {
                id: 3,
                keyValue: 'ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 1,
                createdAt: new Date('2024-01-10'),
                updatedAt: new Date('2024-01-10')
            },
            {
                id: 5,
                keyValue: 'PHOTOSHOP-2024-KEY-0002',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 2,
                createdAt: new Date('2024-01-11'),
                updatedAt: new Date('2024-01-11')
            },
            {
                id: 7,
                keyValue: 'WIN11-PRO-ACTIVATION-002',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 3,
                createdAt: new Date('2024-01-12'),
                updatedAt: new Date('2024-01-12')
            },
            {
                id: 8,
                keyValue: 'WIN11-PRO-ACTIVATION-003',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 3,
                createdAt: new Date('2024-01-12'),
                updatedAt: new Date('2024-01-12')
            }
        ];

        // Seed only unassigned keys
        console.log('🔑 Seeding unassigned Digital Keys...');
        for (const keyData of keySeedData) {
            await sequelize.models.DigitalKey.upsert(keyData, {
                where: { id: keyData.id }
            });
        }
        console.log(`✅ ${keySeedData.length} unassigned Digital Keys seeded`);

        console.log('🎉 Quick seed fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error in quick seed fix:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run the fix
if (require.main === module) {
    quickSeedFix()
        .then(() => {
            console.log('Quick seed fix completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Quick seed fix failed:', error);
            process.exit(1);
        });
}

module.exports = { quickSeedFix };
