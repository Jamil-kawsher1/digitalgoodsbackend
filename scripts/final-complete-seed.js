const { sequelize } = require('../models');

/**
 * Final complete seeding with proper order handling
 */

async function finalCompleteSeed() {
    try {
        console.log('🎯 Final complete seeding...');
        
        // 1. Seed products first (they updated with emojis)
        const productSeedData = require('../seeders/product-seeds');
        console.log('📦 Seeding Products...');
        for (const productData of productSeedData) {
            await sequelize.models.Product.upsert(productData, {
                where: { id: productData.id }
            });
        }
        console.log(`✅ ${productSeedData.length} Products seeded with emojis!`);

        // 2. Seed users
        const userSeedData = require('../seeders/user-seeds');
        const bcrypt = require('bcrypt');
        console.log('📝 Seeding Users...');
        for (const userData of userSeedData) {
            if (userData.password) {
                userData.passwordHash = await bcrypt.hash(userData.password, 10);
                delete userData.password;
            }
            
            await sequelize.models.User.upsert(userData, {
                where: { email: userData.email }
            });
        }
        console.log(`✅ ${userSeedData.length} Users seeded`);

        // 3. Seed orders
        const orderSeedData = require('../seeders/order-seeds');
        console.log('🛒 Seeding Orders...');
        for (const orderData of orderSeedData) {
            await sequelize.models.Order.upsert(orderData, {
                where: { id: orderData.id }
            });
        }
        console.log(`✅ ${orderSeedData.length} Orders seeded`);

        // 4. Seed digital keys (only unassigned ones to avoid FK issues)
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
            },
            {
                id: 10,
                keyValue: 'NORTON-360-PREMIUM-002',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 4,
                createdAt: new Date('2024-01-13'),
                updatedAt: new Date('2024-01-13')
            },
            {
                id: 11,
                keyValue: 'FINAL-CUT-PRO-X-001',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 5,
                createdAt: new Date('2024-01-14'),
                updatedAt: new Date('2024-01-14')
            },
            {
                id: 13,
                keyValue: 'AUTOCAD-2024-PRO-002',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 6,
                createdAt: new Date('2024-01-15'),
                updatedAt: new Date('2024-01-15')
            },
            {
                id: 14,
                keyValue: 'VMWARE-WS-PRO-001',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 7,
                createdAt: new Date('2024-01-16'),
                updatedAt: new Date('2024-01-16')
            },
            {
                id: 16,
                keyValue: 'CAMTASIA-2024-KEY-002',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 8,
                createdAt: new Date('2024-01-17'),
                updatedAt: new Date('2024-01-17')
            },
            {
                id: 17,
                keyValue: 'LOGIC-PRO-X-001',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 9,
                createdAt: new Date('2024-01-18'),
                updatedAt: new Date('2024-01-18')
            },
            {
                id: 18,
                keyValue: 'QUICKBOOKS-PRO-2024-001',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 10,
                createdAt: new Date('2024-01-19'),
                updatedAt: new Date('2024-01-19')
            },
            {
                id: 19,
                keyValue: 'QUICKBOOKS-PRO-2024-002',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 10,
                createdAt: new Date('2024-01-19'),
                updatedAt: new Date('2024-01-19')
            },
            {
                id: 20,
                keyValue: 'QUICKBOOKS-PRO-2024-003',
                isAssigned: false,
                assignedToOrderId: null,
                productId: 10,
                createdAt: new Date('2024-01-19'),
                updatedAt: new Date('2024-01-19')
            }
        ];

        console.log('🔑 Seeding Digital Keys...');
        for (const keyData of keySeedData) {
            await sequelize.models.DigitalKey.upsert(keyData, {
                where: { id: keyData.id }
            });
        }
        console.log(`✅ ${keySeedData.length} Digital Keys seeded`);

        console.log('🎉 Final complete seeding successful!');
        console.log('\n📊 Final Seeding Summary:');
        console.log(`   Products: ${productSeedData.length} (with emojis!)`);
        console.log(`   Users: ${userSeedData.length}`);
        console.log(`   Orders: ${orderSeedData.length}`);
        console.log(`   Digital Keys: ${keySeedData.length}`);
        
    } catch (error) {
        console.error('❌ Error in final complete seeding:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run final seeding
if (require.main === module) {
    finalCompleteSeed()
        .then(() => {
            console.log('Final complete seeding finished successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Final complete seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { finalCompleteSeed };
