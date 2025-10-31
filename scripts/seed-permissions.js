const sequelize = require('../config/db');
const { User, Permission } = require('../models');

const seedPermissions = async () => {
  try {
    console.log('🌱 Starting permissions seeding...');

    // Sync database
    await sequelize.sync({ force: false });
    console.log('✅ Database synced successfully');

    // Create default permissions for admin and user roles
    const defaultPermissions = [
      // Admin permissions
      { feature: 'user_management', role: 'admin', canAccess: true, description: 'Manage users (create, edit, ban regular users)' },
      { feature: 'user_create', role: 'admin', canAccess: true, description: 'Create new users' },
      { feature: 'product_management', role: 'admin', canAccess: true, description: 'Manage products (create, edit, delete)' },
      { feature: 'order_management', role: 'admin', canAccess: true, description: 'Manage orders and payments' },
      { feature: 'key_management', role: 'admin', canAccess: true, description: 'Manage digital keys' },
      { feature: 'database_management', role: 'admin', canAccess: true, description: 'Access database tools' },
      { feature: 'backup_management', role: 'admin', canAccess: true, description: 'Access backup tools' },
      { feature: 'analytics', role: 'admin', canAccess: true, description: 'View analytics dashboard' },
      
      // User permissions (limited)
      { feature: 'user_management', role: 'user', canAccess: false, description: 'Manage users (admin only)' },
      { feature: 'product_management', role: 'user', canAccess: false, description: 'Manage products (admin only)' },
      { feature: 'order_management', role: 'user', canAccess: false, description: 'Manage orders (admin only)' },
      { feature: 'key_management', role: 'user', canAccess: false, description: 'Manage digital keys (admin only)' },
      { feature: 'database_management', role: 'user', canAccess: false, description: 'Access database tools (admin only)' },
      { feature: 'backup_management', role: 'user', canAccess: false, description: 'Access backup tools (admin only)' },
      { feature: 'analytics', role: 'user', canAccess: false, description: 'View analytics dashboard (admin only)' },
      { feature: 'profile_management', role: 'user', canAccess: true, description: 'Manage own profile' },
      { feature: 'order_view', role: 'user', canAccess: true, description: 'View own orders' },
      { feature: 'product_view', role: 'user', canAccess: true, description: 'View products and purchase' },
    ];

    // Insert or update permissions
    for (const permission of defaultPermissions) {
      await Permission.upsert(permission, {
        where: {
          feature: permission.feature,
          role: permission.role
        }
      });
    }

    console.log('✅ Permissions seeded successfully');

    // Check if super admin exists, if not create one
    const superAdminCount = await User.count({
      where: { role: 'super_admin' }
    });

    if (superAdminCount === 0) {
      console.log('👑 Creating default super admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.create({
        name: 'Super Admin',
        email: 'admin@digitalgoods.com',
        passwordHash: hashedPassword,
        role: 'super_admin',
        emailConfirmed: true,
        isActive: true
      });
      
      console.log('✅ Default super admin created (email: admin@digitalgoods.com, password: admin123)');
    }

    console.log('🎉 Permissions seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedPermissions();
}

module.exports = seedPermissions;
