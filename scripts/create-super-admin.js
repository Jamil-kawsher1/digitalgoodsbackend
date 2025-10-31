#!/usr/bin/env node

require("dotenv").config();
const { User } = require("../models");
const bcrypt = require("bcryptjs");

console.log("👑 Creating Super Admin User");
console.log("=" .repeat(50));

async function createSuperAdmin() {
  try {
    // Test Database Connection
    console.log("\n📡 Step 1: Testing Database Connection...");
    await require("../config/db").authenticate();
    console.log("✅ Database connection successful");

    // Step 2: Check for existing user with the same email and delete if found
    console.log("\n🔍 Step 2: Checking for existing user...");
    
    const existingUser = await User.findOne({
      where: { email: 'jamilkawsher@gmail.com' }
    });

    if (existingUser) {
      console.log(`🗑️ Found existing user: ${existingUser.email} (${existingUser.role})`);
      console.log("🔄 Deleting existing user...");
      await existingUser.destroy();
      console.log("✅ Existing user deleted successfully");
    } else {
      console.log("✅ No existing user found with jamilkawsher@gmail.com");
    }

    // Step 3: Create super admin user
    console.log("\n👑 Step 3: Creating Super Admin user...");
    
    const superAdminEmail = 'jamilkawsher@gmail.com';
    const superAdminPassword = '7Bma9b7@';
    
    // Hash password
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);
    console.log("✅ Password hashed successfully");

    // Create super admin user
    const superAdmin = await User.create({
      name: 'Jamal Kawsher',
      email: superAdminEmail,
      passwordHash: passwordHash,
      role: 'super_admin',
      emailConfirmed: true,
      isActive: true,
      lastLoginAt: new Date()
    });

    console.log("✅ Super Admin user created successfully!");
    console.log("  👤 User ID:", superAdmin.id);
    console.log("  📧 Email:", superAdmin.email);
    console.log("  🔐 Role:", superAdmin.role);
    console.log("  🔑 Password:", superAdminPassword);

    // Step 4: Verify the super admin
    console.log("\n🔍 Step 4: Verifying Super Admin creation...");
    
    const verifyUser = await User.findOne({
      where: { email: superAdminEmail }
    });

    if (verifyUser && verifyUser.role === 'super_admin') {
      console.log("✅ Super Admin verification successful!");
      console.log("  🎯 User can now create admins and manage the system");
    } else {
      console.log("❌ Super Admin verification failed!");
      throw new Error("Super Admin was not created correctly");
    }

    // Step 5: Check current user distribution
    console.log("\n📊 Step 5: Current user distribution...");
    
    const [roleStats] = await require("../config/db").query(`
      SELECT role, COUNT(*) as count 
      FROM Users 
      GROUP BY role
      ORDER BY count DESC
    `);
    
    console.log("  📋 Current users by role:");
    roleStats.forEach(stat => {
      console.log(`    ${stat.role}: ${stat.count} users`);
    });

    console.log("\n🎉 Super Admin setup completed successfully!");
    console.log("=" .repeat(50));
    console.log("\n🔐 LOGIN CREDENTIALS:");
    console.log("📧 Email: jamilkawsher@gmail.com");
    console.log("🔑 Password: 7Bma9b7@");
    console.log("👑 Role: super_admin");

  } catch (error) {
    console.error("\n❌ Super Admin creation failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  } finally {
    await require("../config/db").close();
    console.log("\n📦 Database connection closed");
  }
}

// Run the super admin creation
if (require.main === module) {
  createSuperAdmin().catch(console.error);
}

module.exports = { createSuperAdmin };
