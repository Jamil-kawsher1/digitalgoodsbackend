const { User, Permission } = require("../models");
const jwt = require("jsonwebtoken");

/**
 * Authentication middleware - verifies JWT token
 */
const authRequired = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'permissions', 'banned', 'isActive']
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (user.banned) {
      return res.status(403).json({ 
        error: "Account banned",
        reason: user.bannedReason || "Violation of terms"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        error: "Account deactivated"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Check if user has permission to access a feature
 */
const hasPermission = (user, feature) => {
  // Super admins have access to everything
  if (user.role === 'super_admin') {
    return true;
  }

  // Check user's custom permissions if they exist
  if (user.permissions && user.permissions[feature] !== undefined) {
    return user.permissions[feature];
  }

  // Default to role-based permissions
  return true; // Will be checked against database permissions
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: "Insufficient permissions",
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ error: "Server error" });
    }
  };
};

/**
 * Middleware to check if user has permission for specific feature
 */
const requirePermission = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Super admins have access to everything
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Check database permissions
      const permission = await Permission.findOne({
        where: {
          feature: feature,
          role: req.user.role
        }
      });

      // If no permission record exists, deny access
      if (!permission || !permission.canAccess) {
        return res.status(403).json({ 
          error: "Insufficient permissions",
          feature: feature,
          role: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Server error" });
    }
  };
};

/**
 * Middleware to check if user is not banned
 */
const requireActiveUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.banned) {
      return res.status(403).json({ 
        error: "Account banned",
        reason: user.bannedReason || "Violation of terms"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        error: "Account deactivated"
      });
    }

    next();
  } catch (error) {
    console.error("Active user check error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Middleware to check if user can manage other users
 */
const requireUserManagement = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const targetUserId = req.params.id || req.params.userId;
    const currentUserRole = req.user.role;

    // Super admins can manage anyone
    if (currentUserRole === 'super_admin') {
      return next();
    }

    // Admins can manage regular users but not other admins
    if (currentUserRole === 'admin') {
      if (targetUserId) {
        const targetUser = await User.findByPk(targetUserId);
        if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
          return res.status(403).json({ error: "Cannot manage admin users" });
        }
      }
      return next();
    }

    // Regular users cannot manage other users
    return res.status(403).json({ error: "Insufficient permissions" });
  } catch (error) {
    console.error("User management check error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  authRequired,
  requireRole,
  requirePermission,
  requireActiveUser,
  requireUserManagement,
  hasPermission
};
