const express = require("express");
const { User, Permission } = require("../models");
const { Op } = require("sequelize");
const { authRequired } = require("../middleware/auth");
const { requireRole, requirePermission, requireActiveUser, requireUserManagement } = require("../middleware/roleAuth");
const bcrypt = require("bcryptjs");
const router = express.Router();

// Get all users (admin only)
router.get("/", 
  authRequired, 
  requireRole(['admin', 'super_admin']), 
  requirePermission('user_management'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      
      // Search filters
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      if (role) {
        whereClause.role = role;
      }

      if (status === 'banned') {
        whereClause.banned = true;
      } else if (status === 'active') {
        whereClause.banned = false;
        whereClause.isActive = true;
      } else if (status === 'inactive') {
        whereClause.isActive = false;
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'name', 'email', 'role', 'banned', 'bannedReason', 'bannedAt', 'isActive', 'createdAt', 'lastLoginAt'],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(users.count / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get single user
router.get("/:id", 
  authRequired, 
  requireUserManagement,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['passwordHash', 'confirmationCode'] }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Create user (admin only)
router.post("/", 
  authRequired, 
  requireRole(['admin', 'super_admin']), 
  requirePermission('user_create'),
  async (req, res) => {
    try {
      const { name, email, password, role = 'user', permissions } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Validate role
      const validRoles = ['user', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Check if creator can assign this role
      const currentUser = req.user;
      if (role === 'super_admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Cannot create super admin users" });
      }

      if (role === 'admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Cannot create admin users" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        passwordHash,
        role,
        permissions: permissions || null,
        emailConfirmed: true // Admin-created users are pre-confirmed
      });

      // Remove sensitive data
      const userResponse = user.toJSON();
      delete userResponse.passwordHash;
      delete userResponse.confirmationCode;

      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Update user
router.put("/:id", 
  authRequired, 
  requireUserManagement,
  async (req, res) => {
    try {
      const { name, email, role, permissions, isActive } = req.body;
      const userId = req.params.id;
      const currentUser = req.user;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check role assignment permissions
      if (role && role !== user.role) {
        if (role === 'super_admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ error: "Cannot assign super admin role" });
        }

        if (role === 'admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ error: "Cannot assign admin role" });
        }

        if (user.role === 'super_admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ error: "Cannot modify super admin users" });
        }
      }

      // Update user
      await user.update({
        name: name || user.name,
        email: email || user.email,
        role: role || user.role,
        permissions: permissions !== undefined ? permissions : user.permissions,
        isActive: isActive !== undefined ? isActive : user.isActive
      });

      // Remove sensitive data
      const userResponse = user.toJSON();
      delete userResponse.passwordHash;
      delete userResponse.confirmationCode;

      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Ban/Unban user
router.post("/:id/ban", 
  authRequired, 
  requireUserManagement,
  async (req, res) => {
    try {
      const { banned, bannedReason } = req.body;
      const userId = req.params.id;
      const currentUser = req.user;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cannot ban super admins (except other super admins)
      if (user.role === 'super_admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Cannot ban super admin users" });
      }

      // Cannot ban yourself
      if (user.id === currentUser.id) {
        return res.status(400).json({ error: "Cannot ban yourself" });
      }

      await user.update({
        banned: banned,
        bannedReason: banned ? bannedReason : null,
        bannedAt: banned ? new Date() : null
      });

      res.json({ 
        message: banned ? "User banned successfully" : "User unbanned successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          banned,
          bannedReason,
          bannedAt: user.bannedAt
        }
      });
    } catch (error) {
      console.error("Error updating ban status:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Delete user (super admin only)
router.delete("/:id", 
  authRequired, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cannot delete yourself
      if (user.id === currentUser.id) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      await user.destroy();

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get permissions for all roles
router.get("/permissions/all", 
  authRequired, 
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const permissions = await Permission.findAll({
        order: [['role', 'ASC'], ['feature', 'ASC']]
      });

      // Group by role
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.role]) {
          acc[permission.role] = [];
        }
        acc[permission.role].push({
          feature: permission.feature,
          canAccess: permission.canAccess,
          description: permission.description
        });
        return acc;
      }, {});

      res.json(groupedPermissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Update permissions for a role
router.put("/permissions/:role", 
  authRequired, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { permissions } = req.body;
      const { role } = req.params;

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: "Permissions must be an array" });
      }

      // Update permissions
      for (const perm of permissions) {
        await Permission.upsert({
          role,
          feature: perm.feature,
          canAccess: perm.canAccess,
          description: perm.description
        });
      }

      res.json({ message: "Permissions updated successfully" });
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
