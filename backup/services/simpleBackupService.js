const fs = require('fs');
const path = require('path');
const { sequelize, User, Product, Order, DigitalKey } = require('../../models');

class SimpleBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
    this.models = {
      Users: User,
      Products: Product,
      Orders: Order,
      DigitalKeys: DigitalKey
    };
  }

  // Ensure backup directory exists
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
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

  // Create full database backup (JSON format)
  async createFullBackup(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full-backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    try {
      const backupData = {
        metadata: {
          id: timestamp,
          type: 'full',
          createdAt: new Date().toISOString(),
          database: this.getDBConfig().database,
          version: '1.0'
        },
        data: {}
      };

      // Backup all tables
      for (const [tableName, Model] of Object.entries(this.models)) {
        console.log(`Backing up table: ${tableName}`);
        const records = await Model.findAll({ raw: true });
        backupData.data[tableName] = records;
      }

      // Write backup file
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

      // Get file size
      const stats = fs.statSync(filepath);
      const fileSizeInKB = (stats.size / 1024).toFixed(2);

      // Create backup metadata
      const metadata = {
        id: timestamp,
        type: 'full',
        filename: filename,
        filepath: filepath,
        size: fileSizeInKB,
        compressed: false,
        createdAt: new Date().toISOString(),
        database: this.getDBConfig().database,
        tables: Object.keys(this.models)
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return {
        success: true,
        backup: metadata,
        message: `Full database backup created successfully (${fileSizeInKB} KB)`
      };

    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  // Create table-specific backup
  async createTableBackup(tableNames, options = {}) {
    if (!Array.isArray(tableNames)) {
      tableNames = [tableNames];
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tableList = tableNames.join('-');
    const filename = `table-backup-${tableList}-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    try {
      const backupData = {
        metadata: {
          id: timestamp,
          type: 'table',
          tables: tableNames,
          createdAt: new Date().toISOString(),
          database: this.getDBConfig().database,
          version: '1.0'
        },
        data: {}
      };

      // Backup specific tables
      for (const tableName of tableNames) {
        const Model = this.models[tableName];
        if (!Model) {
          throw new Error(`Table ${tableName} not found`);
        }

        console.log(`Backing up table: ${tableName}`);
        const records = await Model.findAll({ raw: true });
        backupData.data[tableName] = records;
      }

      // Write backup file
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

      // Get file size
      const stats = fs.statSync(filepath);
      const fileSizeInKB = (stats.size / 1024).toFixed(2);

      // Create backup metadata
      const metadata = {
        id: timestamp,
        type: 'table',
        tables: tableNames,
        filename: filename,
        filepath: filepath,
        size: fileSizeInKB,
        compressed: false,
        createdAt: new Date().toISOString(),
        database: this.getDBConfig().database
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return {
        success: true,
        backup: metadata,
        message: `Table backup created for ${tableNames.join(', ')} (${fileSizeInKB} KB)`
      };

    } catch (error) {
      console.error('Table backup failed:', error);
      throw new Error(`Table backup failed: ${error.message}`);
    }
  }

  // Create data-only backup (no structure, just data)
  async createDataOnlyBackup(tableNames, options = {}) {
    // For simplicity, this is the same as table backup for now
    return await this.createTableBackup(tableNames, { ...options, dataType: 'data-only' });
  }

  // Get list of all tables
  async getTableList() {
    return Object.keys(this.models);
  }

  // Get table information
  async getTableInfo(tableName) {
    try {
      const Model = this.models[tableName];
      if (!Model) {
        throw new Error(`Table ${tableName} not found`);
      }

      const rowCount = await Model.count();
      const columnCount = Object.keys(Model.rawAttributes || {}).length;

      return {
        name: tableName,
        rowCount: rowCount,
        columnCount: columnCount,
        estimatedSize: `${(rowCount * columnCount * 50 / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      console.error(`Failed to get table info for ${tableName}:`, error);
      throw new Error(`Failed to get table info: ${error.message}`);
    }
  }

  // Save backup metadata
  async saveBackupMetadata(metadata) {
    const metadataFile = path.join(this.backupDir, 'metadata.json');
    let metadataList = [];

    try {
      if (fs.existsSync(metadataFile)) {
        const data = fs.readFileSync(metadataFile, 'utf8');
        metadataList = JSON.parse(data);
      }
    } catch (error) {
      console.log('Creating new metadata file');
    }

    metadataList.push(metadata);
    
    // Keep only last 50 backup records
    if (metadataList.length > 50) {
      metadataList = metadataList.slice(-50);
    }

    fs.writeFileSync(metadataFile, JSON.stringify(metadataList, null, 2));
  }

  // Get all backup metadata
  getBackupList() {
    const metadataFile = path.join(this.backupDir, 'metadata.json');
    
    try {
      if (fs.existsSync(metadataFile)) {
        const data = fs.readFileSync(metadataFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read backup metadata:', error);
    }
    
    return [];
  }

  // Delete backup
  async deleteBackup(backupId) {
    const metadataList = this.getBackupList();
    const backupIndex = metadataList.findIndex(backup => backup.id === backupId);
    
    if (backupIndex === -1) {
      throw new Error('Backup not found');
    }

    const backup = metadataList[backupIndex];
    
    try {
      // Delete backup file
      if (fs.existsSync(backup.filepath)) {
        fs.unlinkSync(backup.filepath);
      }

      // Remove from metadata
      metadataList.splice(backupIndex, 1);
      
      const metadataFile = path.join(this.backupDir, 'metadata.json');
      fs.writeFileSync(metadataFile, JSON.stringify(metadataList, null, 2));

      return {
        success: true,
        message: 'Backup deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  // Get backup file content for download
  getBackupFile(backupId) {
    const metadataList = this.getBackupList();
    const backup = metadataList.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }

    if (!fs.existsSync(backup.filepath)) {
      throw new Error('Backup file not found');
    }

    return {
      filepath: backup.filepath,
      filename: backup.filename,
      contentType: 'application/json'
    };
  }
}

module.exports = SimpleBackupService;
