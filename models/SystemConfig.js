const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * System Configuration Model
 * Stores system-wide settings like auto-assignment configuration
 */
const SystemConfig = sequelize.define('SystemConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Configuration key identifier'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Configuration value (JSON or string)'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Human-readable description of the configuration'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
    comment: 'Category for grouping configurations'
  },
  isEditable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this config can be edited via API'
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    comment: 'Data type of the configuration value'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who last updated this configuration'
  }
}, {
  tableName: 'system_configs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['key']
    },
    {
      fields: ['category']
    }
  ]
});

/**
 * Static methods for configuration management
 */
SystemConfig.getConfig = async function(key, defaultValue = null) {
  try {
    const config = await this.findOne({ where: { key } });
    if (!config) return defaultValue;
    
    // Parse value based on type
    switch (config.type) {
      case 'boolean':
        return config.value === 'true' || config.value === true;
      case 'number':
        return parseFloat(config.value);
      case 'json':
        return JSON.parse(config.value);
      default:
        return config.value;
    }
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return defaultValue;
  }
};

SystemConfig.setConfig = async function(key, value, updatedBy = null, description = null, category = 'general') {
  try {
    let stringValue;
    let type = 'string';
    
    // Determine type and convert value to string
    if (typeof value === 'boolean') {
      stringValue = value.toString();
      type = 'boolean';
    } else if (typeof value === 'number') {
      stringValue = value.toString();
      type = 'number';
    } else if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
      type = 'json';
    } else {
      stringValue = value;
    }

    const [config, created] = await this.findOrCreate({
      where: { key },
      defaults: {
        key,
        value: stringValue,
        type,
        category,
        description,
        isEditable: true
      }
    });

    if (!created) {
      await config.update({
        value: stringValue,
        type,
        description: description || config.description,
        updatedBy
      });
    }

    return await this.getConfig(key);
  } catch (error) {
    console.error(`Error setting config ${key}:`, error);
    throw error;
  }
};

SystemConfig.getAllConfigs = async function(category = null) {
  try {
    const whereClause = {};
    if (category) {
      whereClause.category = category;
    }

    const configs = await this.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    const result = {};
    configs.forEach(config => {
      let value = config.value;
      
      // Parse based on type
      switch (config.type) {
        case 'boolean':
          value = config.value === 'true' || config.value === true;
          break;
        case 'number':
          value = parseFloat(config.value);
          break;
        case 'json':
          value = JSON.parse(config.value);
          break;
      }
      
      result[config.key] = {
        value,
        description: config.description,
        category: config.category,
        type: config.type,
        isEditable: config.isEditable,
        updatedAt: config.updatedAt
      };
    });

    return result;
  } catch (error) {
    console.error('Error getting all configs:', error);
    throw error;
  }
};

SystemConfig.initializeDefaultConfigs = async function() {
  const defaultConfigs = [
    {
      key: 'auto_assignment_enabled',
      value: false,
      description: 'Enable automatic key assignment for paid orders',
      category: 'auto_assignment',
      type: 'boolean'
    },
    {
      key: 'auto_assignment_trigger_on_payment',
      value: true,
      description: 'Trigger auto-assignment when payment is confirmed',
      category: 'auto_assignment',
      type: 'boolean'
    },
    {
      key: 'auto_assignment_trigger_on_status_change',
      value: true,
      description: 'Trigger auto-assignment when order status changes to paid',
      category: 'auto_assignment',
      type: 'boolean'
    },
    {
      key: 'auto_assignment_strategy',
      value: 'first_available',
      description: 'Key selection strategy for auto-assignment',
      category: 'auto_assignment',
      type: 'string'
    },
    {
      key: 'auto_assignment_concurrent_limit',
      value: 5,
      description: 'Maximum concurrent auto-assignments',
      category: 'auto_assignment',
      type: 'number'
    }
  ];

  for (const config of defaultConfigs) {
    try {
      await this.findOrCreate({
        where: { key: config.key },
        defaults: config
      });
    } catch (error) {
      console.error(`Error initializing config ${config.key}:`, error);
    }
  }
};

module.exports = SystemConfig;
