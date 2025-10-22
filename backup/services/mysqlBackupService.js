const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const execAsync = promisify(exec);
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

class MySQLBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
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

  // Create full database backup
  async createFullBackup(options = {}) {
    const config = this.getDBConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    const compress = options.compress !== false;
    const finalFile = compress ? `${filepath}.gz` : filepath;

    try {
      // Build mysqldump command
      let command = `mysqldump -h${config.host} -P${config.port} -u${config.user} -p${config.password} ${config.database}`;
      
      if (options.compress === false) {
        command += ` > "${filepath}"`;
      } else {
        command += ` | gzip > "${finalFile}"`;
      }

      console.log('Creating backup with command:', command.replace(/-p[^ ]+/, '-p***'));
      
      await execAsync(command);

      // Get file size
      const stats = fs.statSync(finalFile);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Create backup metadata
      const metadata = {
        id: timestamp,
        type: 'full',
        filename: compress ? `${filename}.gz` : filename,
        filepath: finalFile,
        size: fileSizeInMB,
        compressed: compress,
        createdAt: new Date().toISOString(),
        database: config.database,
        tables: await this.getTableList()
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return {
        success: true,
        backup: metadata,
        message: `Full database backup created successfully (${fileSizeInMB} MB)`
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

    const config = this.getDBConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tableList = tableNames.join('-');
    const filename = `table-backup-${tableList}-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    const compress = options.compress !== false;
    const finalFile = compress ? `${filepath}.gz` : filepath;

    try {
      // Build mysqldump command for specific tables
      let command = `mysqldump -h${config.host} -P${config.port} -u${config.user} -p${config.password} ${config.database} ${tableNames.join(' ')}`;
      
      if (options.compress === false) {
        command += ` > "${filepath}"`;
      } else {
        command += ` | gzip > "${finalFile}"`;
      }

      console.log('Creating table backup with command:', command.replace(/-p[^ ]+/, '-p***'));
      
      await execAsync(command);

      // Get file size
      const stats = fs.statSync(finalFile);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Create backup metadata
      const metadata = {
        id: timestamp,
        type: 'table',
        tables: tableNames,
        filename: compress ? `${filename}.gz` : filename,
        filepath: finalFile,
        size: fileSizeInMB,
        compressed: compress,
        createdAt: new Date().toISOString(),
        database: config.database
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return {
        success: true,
        backup: metadata,
        message: `Table backup created for ${tableNames.join(', ')} (${fileSizeInMB} MB)`
      };

    } catch (error) {
      console.error('Table backup failed:', error);
      throw new Error(`Table backup failed: ${error.message}`);
    }
  }

  // Create data-only backup (no structure)
  async createDataOnlyBackup(tableNames, options = {}) {
    if (!Array.isArray(tableNames)) {
      tableNames = [tableNames];
    }

    const config = this.getDBConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tableList = tableNames.join('-');
    const filename = `data-backup-${tableList}-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    const compress = options.compress !== false;
    const finalFile = compress ? `${filepath}.gz` : filepath;

    try {
      // Build mysqldump command for data only
      let command = `mysqldump -h${config.host} -P${config.port} -u${config.user} -p${config.password} --no-create-info --skip-triggers ${config.database} ${tableNames.join(' ')}`;
      
      if (options.compress === false) {
        command += ` > "${filepath}"`;
      } else {
        command += ` | gzip > "${finalFile}"`;
      }

      console.log('Creating data-only backup with command:', command.replace(/-p[^ ]+/, '-p***'));
      
      await execAsync(command);

      // Get file size
      const stats = fs.statSync(finalFile);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Create backup metadata
      const metadata = {
        id: timestamp,
        type: 'data',
        tables: tableNames,
        filename: compress ? `${filename}.gz` : filename,
        filepath: finalFile,
        size: fileSizeInMB,
        compressed: compress,
        createdAt: new Date().toISOString(),
        database: config.database
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return {
        success: true,
        backup: metadata,
        message: `Data-only backup created for ${tableNames.join(', ')} (${fileSizeInMB} MB)`
      };

    } catch (error) {
      console.error('Data-only backup failed:', error);
      throw new Error(`Data-only backup failed: ${error.message}`);
    }
  }

  // Get list of all tables in the database
  async getTableList() {
    const config = this.getDBConfig();
    
    try {
      const command = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "SHOW TABLES;" ${config.database}`;
      const { stdout } = await execAsync(command);
      
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Tables_in_'));
      return lines.map(line => line.trim());
    } catch (error) {
      console.error('Failed to get table list:', error);
      throw new Error(`Failed to get table list: ${error.message}`);
    }
  }

  // Get table information
  async getTableInfo(tableName) {
    const config = this.getDBConfig();
    
    try {
      const command = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "SELECT COUNT(*) as row_count FROM \`${tableName}\`;" ${config.database}`;
      const { stdout } = await execAsync(command);
      
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('row_count'));
      const rowCount = lines.length > 0 ? parseInt(lines[0].trim()) : 0;

      // Get table structure info
      const structureCommand = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "DESCRIBE \`${tableName}\`;" ${config.database}`;
      const { stdout: structureOutput } = await execAsync(structureCommand);
      const columns = structureOutput.split('\n').filter(line => line.trim() && !line.includes('Field')).length - 1;

      return {
        name: tableName,
        rowCount,
        columnCount: columns,
        estimatedSize: `${(rowCount * columns * 50 / 1024).toFixed(2)} KB` // Rough estimate
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
      contentType: backup.compressed ? 'application/gzip' : 'application/sql'
    };
  }
}

module.exports = MySQLBackupService;
