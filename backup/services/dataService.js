const { sequelize, User, Product, Order, DigitalKey } = require('../../models');
const Refund = require('../../models/Refund');

class DataService {
  constructor() {
    // Use existing models instead of MySQL command line tools
    this.models = {
      Users: User,
      Products: Product,
      Orders: Order,
      DigitalKeys: DigitalKey,
      Refunds: Refund
    };
  }

  // Get database configuration from environment
  getDBConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'admin',
      database: process.env.DB_NAME || 'goods'
    };
  }

  // Get list of all tables
  async getTableList() {
    return Object.keys(this.models);
  }

  // Get detailed table information
  async getTableDetails(tableName) {
    try {
      const Model = this.models[tableName];
      if (!Model) {
        throw new Error(`Table ${tableName} not found`);
      }

      // Get row count
      const rowCount = await Model.count();
      
      // Get column count from model attributes
      const columnCount = Object.keys(Model.rawAttributes || {}).length;
      
      // Estimate size (rough calculation)
      const estimatedSize = `${(rowCount * columnCount * 50 / 1024).toFixed(2)} KB`;

      return {
        name: tableName,
        rowCount: rowCount,
        columnCount: columnCount,
        estimatedSize: estimatedSize
      };
    } catch (error) {
      console.error(`Failed to get table details for ${tableName}:`, error);
      throw new Error(`Failed to get table details: ${error.message}`);
    }
  }

  // Get all tables with detailed information
  async getAllTableDetails() {
    try {
      const tables = await this.getTableList();
      const tableDetails = await Promise.all(
        tables.map(table => this.getTableDetails(table))
      );
      return tableDetails;
    } catch (error) {
      console.error('Failed to get table details:', error);
      throw new Error(`Failed to get table details: ${error.message}`);
    }
  }

  // Clear table (truncate) with backup - handles foreign key constraints
  async clearTable(tableName, options = {}) {
    const SimpleBackupService = require('./simpleBackupService');
    const backupSvc = new SimpleBackupService();

    try {
      // Create backup before clearing if requested
      if (options.createBackup !== false) {
        console.log(`Creating backup for table ${tableName} before clearing...`);
        await backupSvc.createTableBackup([tableName], { 
          description: `Pre-clear backup for table ${tableName}`
        });
      }

      const Model = this.models[tableName];
      if (!Model) {
        throw new Error(`Table ${tableName} not found`);
      }

      let recordsDeleted = 0;

      // Handle foreign key constraints by clearing in correct order
      if (tableName === 'Users') {
        // Clear dependent tables first
        if (this.models.Refunds) {
          recordsDeleted += await this.models.Refunds.destroy({ where: {} });
        }
        if (this.models.Orders) {
          recordsDeleted += await this.models.Orders.destroy({ where: {} });
        }
        // Then clear the main table
        recordsDeleted += await Model.destroy({ where: {} });
      } else if (tableName === 'Products') {
        // Clear dependent tables first
        if (this.models.DigitalKeys) {
          recordsDeleted += await this.models.DigitalKeys.destroy({ where: {} });
        }
        if (this.models.Orders) {
          recordsDeleted += await this.models.Orders.destroy({ where: {} });
        }
        // Then clear the main table
        recordsDeleted += await Model.destroy({ where: {} });
      } else if (tableName === 'Orders') {
        // Clear Refunds first (depends on Orders)
        if (this.models.Refunds) {
          recordsDeleted += await this.models.Refunds.destroy({ where: {} });
        }
        // Then clear Orders
        recordsDeleted += await Model.destroy({ where: {} });
      } else {
        // For other tables, just clear directly
        recordsDeleted = await Model.destroy({ where: {} });
      }

      // Log the operation
      await this.logDataOperation({
        type: 'clear_table',
        table: tableName,
        recordsDeleted: recordsDeleted,
        backupCreated: options.createBackup !== false,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `Table ${tableName} cleared successfully`,
        table: tableName,
        recordsDeleted: recordsDeleted
      };

    } catch (error) {
      console.error(`Failed to clear table ${tableName}:`, error);
      throw new Error(`Failed to clear table: ${error.message}`);
    }
  }

  // Delete records from table with conditions
  async deleteRecords(tableName, conditions, options = {}) {
    const config = this.getDBConfig();
    const backupSvc = new this.backupService();

    try {
      // Build WHERE clause
      let whereClause = '';
      if (conditions && Object.keys(conditions).length > 0) {
        const whereConditions = Object.entries(conditions).map(([key, value]) => {
          if (typeof value === 'string') {
            return `\`${key}\` = '${value}'`;
          } else if (value === null) {
            return `\`${key}\` IS NULL`;
          } else if (Array.isArray(value)) {
            return `\`${key}\` IN (${value.map(v => `'${v}'`).join(', ')})`;
          } else {
            return `\`${key}\` = ${value}`;
          }
        });
        whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      }

      // Get count of records to be deleted
      const countCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "SELECT COUNT(*) as count FROM \`${tableName}\` ${whereClause};" ${config.database}`;
      const { stdout: countOutput } = await execAsync(countCommand);
      const deleteCount = parseInt(countOutput.split('\n')[1]?.trim() || '0');

      if (deleteCount === 0) {
        return {
          success: true,
          message: 'No records found matching the conditions',
          table: tableName,
          recordsAffected: 0
        };
      }

      // Create backup before deleting if requested
      if (options.createBackup !== false) {
        console.log(`Creating backup for table ${tableName} before deletion...`);
        await backupSvc.createTableBackup([tableName], { 
          compress: true,
          description: `Pre-delete backup for table ${tableName}`
        });
      }

      // Execute DELETE command
      const deleteCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "DELETE FROM \`${tableName}\` ${whereClause};" ${config.database}`;
      
      console.log(`Deleting records from ${tableName} with command:`, deleteCommand.replace(/-p[^ ]+/, '-p***'));
      await execAsync(deleteCommand);

      // Log the operation
      await this.logDataOperation({
        type: 'delete_records',
        table: tableName,
        conditions: conditions,
        recordsDeleted: deleteCount,
        backupCreated: options.createBackup !== false,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `Deleted ${deleteCount} records from ${tableName}`,
        table: tableName,
        recordsAffected: deleteCount,
        conditions: conditions
      };

    } catch (error) {
      console.error(`Failed to delete records from ${tableName}:`, error);
      throw new Error(`Failed to delete records: ${error.message}`);
    }
  }

  // Delete records by date range
  async deleteRecordsByDateRange(tableName, dateColumn, startDate, endDate, options = {}) {
    const conditions = {};
    
    if (startDate) {
      conditions[`${dateColumn} >=`] = startDate;
    }
    
    if (endDate) {
      conditions[`${dateColumn} <=`] = endDate;
    }

    return await this.deleteRecords(tableName, conditions, options);
  }

  // Delete old records (older than specified days)
  async deleteOldRecords(tableName, dateColumn, daysOld, options = {}) {
    const config = this.getDBConfig();
    const backupSvc = new this.backupService();

    try {
      // Calculate date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysOld);
      const dateThreshold = thresholdDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get count of records to be deleted
      const countCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "SELECT COUNT(*) as count FROM \`${tableName}\` WHERE \`${dateColumn}\` < '${dateThreshold}';" ${config.database}`;
      const { stdout: countOutput } = await execAsync(countCommand);
      const deleteCount = parseInt(countOutput.split('\n')[1]?.trim() || '0');

      if (deleteCount === 0) {
        return {
          success: true,
          message: `No records older than ${daysOld} days found`,
          table: tableName,
          recordsAffected: 0,
          dateThreshold: dateThreshold
        };
      }

      // Create backup before deleting if requested
      if (options.createBackup !== false) {
        console.log(`Creating backup for table ${tableName} before deleting old records...`);
        await backupSvc.createTableBackup([tableName], { 
          compress: true,
          description: `Pre-delete backup for old records in table ${tableName}`
        });
      }

      // Execute DELETE command
      const deleteCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "DELETE FROM \`${tableName}\` WHERE \`${dateColumn}\` < '${dateThreshold}';" ${config.database}`;
      
      console.log(`Deleting old records from ${tableName} with command:`, deleteCommand.replace(/-p[^ ]+/, '-p***'));
      await execAsync(deleteCommand);

      // Log the operation
      await this.logDataOperation({
        type: 'delete_old_records',
        table: tableName,
        dateColumn: dateColumn,
        daysOld: daysOld,
        dateThreshold: dateThreshold,
        recordsDeleted: deleteCount,
        backupCreated: options.createBackup !== false,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `Deleted ${deleteCount} old records from ${tableName} (older than ${daysOld} days)`,
        table: tableName,
        recordsAffected: deleteCount,
        dateColumn: dateColumn,
        daysOld: daysOld,
        dateThreshold: dateThreshold
      };

    } catch (error) {
      console.error(`Failed to delete old records from ${tableName}:`, error);
      throw new Error(`Failed to delete old records: ${error.message}`);
    }
  }

  // Archive records (move to archive table)
  async archiveRecords(tableName, conditions, options = {}) {
    const config = this.getDBConfig();
    const backupSvc = new this.backupService();

    try {
      const archiveTableName = `${tableName}_archive`;
      
      // Create archive table if it doesn't exist
      const createArchiveCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "CREATE TABLE IF NOT EXISTS \`${archiveTableName}\` LIKE \`${tableName}\`;" ${config.database}`;
      await execAsync(createArchiveCommand);

      // Build WHERE clause
      let whereClause = '';
      if (conditions && Object.keys(conditions).length > 0) {
        const whereConditions = Object.entries(conditions).map(([key, value]) => {
          if (typeof value === 'string') {
            return `\`${key}\` = '${value}'`;
          } else if (value === null) {
            return `\`${key}\` IS NULL`;
          } else if (Array.isArray(value)) {
            return `\`${key}\` IN (${value.map(v => `'${v}'`).join(', ')})`;
          } else {
            return `\`${key}\` = ${value}`;
          }
        });
        whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      }

      // Get count of records to be archived
      const countCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "SELECT COUNT(*) as count FROM \`${tableName}\` ${whereClause};" ${config.database}`;
      const { stdout: countOutput } = await execAsync(countCommand);
      const archiveCount = parseInt(countOutput.split('\n')[1]?.trim() || '0');

      if (archiveCount === 0) {
        return {
          success: true,
          message: 'No records found matching the conditions',
          table: tableName,
          recordsAffected: 0
        };
      }

      // Create backup before archiving if requested
      if (options.createBackup !== false) {
        console.log(`Creating backup for table ${tableName} before archiving...`);
        await backupSvc.createTableBackup([tableName], { 
          compress: true,
          description: `Pre-archive backup for table ${tableName}`
        });
      }

      // Copy records to archive table
      const copyCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "INSERT INTO \`${archiveTableName}\` SELECT * FROM \`${tableName}\` ${whereClause};" ${config.database}`;
      await execAsync(copyCommand);

      // Delete records from original table
      const deleteCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "DELETE FROM \`${tableName}\` ${whereClause};" ${config.database}`;
      await execAsync(deleteCommand);

      // Log the operation
      await this.logDataOperation({
        type: 'archive_records',
        table: tableName,
        archiveTable: archiveTableName,
        conditions: conditions,
        recordsArchived: archiveCount,
        backupCreated: options.createBackup !== false,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `Archived ${archiveCount} records from ${tableName} to ${archiveTableName}`,
        table: tableName,
        archiveTable: archiveTableName,
        recordsAffected: archiveCount,
        conditions: conditions
      };

    } catch (error) {
      console.error(`Failed to archive records from ${tableName}:`, error);
      throw new Error(`Failed to archive records: ${error.message}`);
    }
  }

  // Get table row count
  async getTableRowCount(tableName) {
    try {
      const Model = this.models[tableName];
      if (!Model) {
        throw new Error(`Table ${tableName} not found`);
      }

      const count = await Model.count();
      return count;
    } catch (error) {
      console.error(`Failed to get row count for ${tableName}:`, error);
      throw new Error(`Failed to get row count: ${error.message}`);
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    try {
      const tables = await this.getAllTableDetails();
      const totalRecords = tables.reduce((sum, table) => sum + table.rowCount, 0);
      const totalSize = tables.reduce((sum, table) => {
        const sizeInKB = parseFloat(table.estimatedSize) || 0;
        return sum + sizeInKB;
      }, 0);

      return {
        totalTables: tables.length,
        totalRecords: totalRecords,
        totalEstimatedSize: `${totalSize.toFixed(2)} KB`,
        tables: tables
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw new Error(`Failed to get database stats: ${error.message}`);
    }
  }

  // Log data operations
  async logDataOperation(operation) {
    const fs = require('fs');
    const path = require('path');
    
    const logFile = path.join(__dirname, '../data-operations.json');
    let operations = [];

    try {
      if (fs.existsSync(logFile)) {
        const data = fs.readFileSync(logFile, 'utf8');
        operations = JSON.parse(data);
      }
    } catch (error) {
      console.log('Creating new data operations log file');
    }

    operations.push(operation);
    
    // Keep only last 100 operations
    if (operations.length > 100) {
      operations = operations.slice(-100);
    }

    fs.writeFileSync(logFile, JSON.stringify(operations, null, 2));
  }

  // Get data operations history
  getOperationsHistory() {
    const fs = require('fs');
    const path = require('path');
    
    const logFile = path.join(__dirname, '../data-operations.json');
    
    try {
      if (fs.existsSync(logFile)) {
        const data = fs.readFileSync(logFile, 'utf8');
        return JSON.parse(data).reverse(); // Most recent first
      }
    } catch (error) {
      console.error('Failed to read operations history:', error);
    }
    
    return [];
  }
}

module.exports = DataService;
