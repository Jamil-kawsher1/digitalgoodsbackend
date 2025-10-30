const { User, sequelize } = require('../models');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  try {
    console.log('🔍 Checking for existing admin users...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log(`   - Email: ${existingAdmin.email}`);
      console.log(`   - Name: ${existingAdmin.name || 'N/A'}`);
      console.log(`   - ID: ${existingAdmin.id}`);
      return existingAdmin;
    }
    
    console.log('📝 Creating admin user...');
    
    // Create admin user
    const adminEmail = 'admin@digistore.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: hashedPassword,
      role: 'admin',
      emailConfirmed: true
    });
    
    console.log('✅ Admin user created successfully:');
    console.log(`   - Email: ${adminEmail}`);
    console.log(`   - Password: ${adminPassword}`);
    console.log(`   - Name: ${adminUser.name}`);
    console.log(`   - ID: ${adminUser.id}`);
    console.log('\n🔐 Use these credentials to log in as admin');
    console.log('⚠️  Remember to change the password after first login!');
    
    return adminUser;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
}

async function listAllUsers() {
  try {
    console.log('\n📋 All users in database:');
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'emailConfirmed', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    if (users.length === 0) {
      console.log('   No users found');
      return;
    }
    
    users.forEach(user => {
      console.log(`   - ${user.name || 'No name'} (${user.email}) - Role: ${user.role} - Confirmed: ${user.emailConfirmed}`);
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

// Main execution
async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    await listAllUsers();
    await createAdminUser();
    
    console.log('\n🎉 Admin setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createAdminUser, listAllUsers };
