const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const execAsync = promisify(exec);
const gunzipAsync = promisify(zlib.gunzip);

class MySQLRestoreService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
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

  // Restore full database from backup
  async restoreFromBackup(backupId, options = {}) {
    const backupService = require('./mysqlBackupService');
    const backupSvc = new backupService();
    
    try {
      // Get backup file info
      const backupFile = backupSvc.getBackupFile(backupId);
      const config = this.getDBConfig();

      // Create pre-restore backup if requested
      if (options.createPreBackup !== false) {
        console.log('Creating pre-restore backup...');
        await backupSvc.createFullBackup({ 
          compress: true,
          description: 'Pre-restore backup before restoring from ' + backupId
        });
      }

      // Build restore command
      let command;
      if (backupFile.contentType === 'application/gzip') {
        command = `gunzip < "${backupFile.filepath}" | mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} ${config.database}`;
      } else {
        command = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} ${config.database} < "${backupFile.filepath}"`;
      }

      console.log('Restoring database with command:', command.replace(/-p[^ ]+/, '-p***'));

      // Execute restore
      await execAsync(command);

      // Create restore metadata
      const restoreMetadata = {
        id: new Date().toISOString().replace(/[:.]/g, '-'),
        backupId: backupId,
        backupFile: backupFile.filename,
        restoredAt: new Date().toISOString(),
        database: config.database,
        preBackupCreated: options.createPreBackup !== false,
        type: 'full'
      };

      // Save restore metadata
      await this.saveRestoreMetadata(restoreMetadata);

      return {
        success: true,
        restore: restoreMetadata,
        message: 'Database restored successfully'
      };

    } catch (error) {
      console.error('Database restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  // Restore specific tables from backup
  async restoreTables(backupId, tableNames, options = {}) {
    if (!Array.isArray(tableNames)) {
      tableNames = [tableNames];
    }

    const backupService = require('./mysqlBackupService');
    const backupSvc = new backupService();
    
    try {
      // Get backup file info
      const backupFile = backupSvc.getBackupFile(backupId);
      const config = this.getDBConfig();

      // Create pre-restore backup if requested
      if (options.createPreBackup !== false) {
        console.log('Creating pre-restore backup for tables...');
        await backupSvc.createTableBackup(tableNames, { 
          compress: true,
          description: 'Pre-restore backup for tables before restoring from ' + backupId
        });
      }

      // Create temporary SQL file with only specified tables
      const tempFile = await this.extractTablesFromBackup(backupFile.filepath, tableNames, backupFile.contentType);

      try {
        // Build restore command for specific tables
        let command = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} ${config.database} < "${tempFile}"`;

        console.log('Restoring tables with command:', command.replace(/-p[^ ]+/, '-p***'));

        // Execute restore
        await execAsync(command);

        // Create restore metadata
        const restoreMetadata = {
          id: new Date().toISOString().replace(/[:.]/g, '-'),
          backupId: backupId,
          backupFile: backupFile.filename,
          tables: tableNames,
          restoredAt: new Date().toISOString(),
          database: config.database,
          preBackupCreated: options.createPreBackup !== false,
          type: 'tables'
        };

        // Save restore metadata
        await this.saveRestoreMetadata(restoreMetadata);

        return {
          success: true,
          restore: restoreMetadata,
          message: `Tables ${tableNames.join(', ')} restored successfully`
        };

      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }

    } catch (error) {
      console.error('Table restore failed:', error);
      throw new Error(`Table restore failed: ${error.message}`);
    }
  }

  // Extract specific tables from backup file
  async extractTablesFromBackup(backupFilePath, tableNames, contentType) {
    const tempFile = path.join(this.backupDir, `temp-${Date.now()}.sql`);
    
    try {
      let content;
      
      // Read and decompress if necessary
      if (contentType === 'application/gzip') {
        const compressed = fs.readFileSync(backupFilePath);
        content = await gunzipAsync(compressed);
      } else {
        content = fs.readFileSync(backupFilePath);
      }

      const sqlContent = content.toString();
      
      // Extract table-specific SQL
      let extractedSQL = '';
      const tablePatterns = tableNames.map(table => new RegExp('-- Table structure for table `' + table + '`[\\s\\S]*?-- Dumping data for table `' + table + '`[\\s\\S]*?(?=--|$)', 'g'));
      
      for (const pattern of tablePatterns) {
        const matches = sqlContent.match(pattern);
        if (matches) {
          extractedSQL += matches.join('\n') + '\n';
        }
      }

      // If no structured matches found, try simpler approach
      if (!extractedSQL) {
        const lines = sqlContent.split('\n');
        let currentTable = null;
        let includeLines = false;
        
        for (const line of lines) {
          // Check if line contains a table creation or data insertion for our tables
          for (const table of tableNames) {
            if (line.includes(`CREATE TABLE \`${table}\``) || line.includes(`INSERT INTO \`${table}\``)) {
              currentTable = table;
              includeLines = true;
              break;
            }
          }
          
          // Stop including if we hit a different table
          if (includeLines && currentTable) {
            if (line.includes('CREATE TABLE `') && !line.includes(`CREATE TABLE \`${currentTable}\``)) {
              includeLines = false;
              currentTable = null;
            }
          }
          
          if (includeLines) {
            extractedSQL += line + '\n';
          }
        }
      }

      // Write extracted content to temp file
      fs.writeFileSync(tempFile, extractedSQL);
      
      if (!extractedSQL.trim()) {
        throw new Error(`No data found for tables: ${tableNames.join(', ')}`);
      }

      return tempFile;

    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw error;
    }
  }

  // Preview backup content
  async previewBackup(backupId) {
    const backupService = require('./mysqlBackupService');
    const backupSvc = new backupService();
    
    try {
      // Get backup file info
      const backupFile = backupSvc.getBackupFile(backupId);
      
      let content;
      
      // Read and decompress if necessary
      if (backupFile.contentType === 'application/gzip') {
        const compressed = fs.readFileSync(backupFile.filepath);
        const decompressed = await gunzipAsync(compressed);
        content = decompressed.toString();
      } else {
        content = fs.readFileSync(backupFile.filepath, 'utf8');
      }

      // Extract table information
      const tableMatches = content.match(/-- Table structure for table `([^`]+)`/g) || [];
      const tables = tableMatches.map(match => match.match(/`([^`]+)`/)[1]);

      // Extract data insertion information
      const insertMatches = content.match(/INSERT INTO `([^`]+)`/g) || [];
      const tablesWithData = [...new Set(insertMatches.map(match => match.match(/`([^`]+)`/)[1]))];

      // Get first few lines as preview
      const previewLines = content.split('\n').slice(0, 20).join('\n');

      return {
        backupId: backupId,
        filename: backupFile.filename,
        tables: tables,
        tablesWithData: tablesWithData,
        totalTables: tables.length,
        tablesWithDataCount: tablesWithData.length,
        estimatedSize: `${(content.length / 1024).toFixed(2)} KB`,
        preview: previewLines,
        canRestore: tables.length > 0
      };

    } catch (error) {
      console.error('Failed to preview backup:', error);
      throw new Error(`Failed to preview backup: ${error.message}`);
    }
  }

  // Save restore metadata
  async saveRestoreMetadata(metadata) {
    const metadataFile = path.join(this.backupDir, 'restore-metadata.json');
    let metadataList = [];

    try {
      if (fs.existsSync(metadataFile)) {
        const data = fs.readFileSync(metadataFile, 'utf8');
        metadataList = JSON.parse(data);
      }
    } catch (error) {
      console.log('Creating new restore metadata file');
    }

    metadataList.push(metadata);
    
    // Keep only last 50 restore records
    if (metadataList.length > 50) {
      metadataList = metadataList.slice(-50);
    }

    fs.writeFileSync(metadataFile, JSON.stringify(metadataList, null, 2));
  }

  // Get all restore history
  getRestoreHistory() {
    const metadataFile = path.join(this.backupDir, 'restore-metadata.json');
    
    try {
      if (fs.existsSync(metadataFile)) {
        const data = fs.readFileSync(metadataFile, 'utf8');
        return JSON.parse(data).reverse(); // Most recent first
      }
    } catch (error) {
      console.error('Failed to read restore metadata:', error);
    }
    
    return [];
  }

  // Validate backup file
  async validateBackup(backupId) {
    const backupService = require('./mysqlBackupService');
    const backupSvc = new backupService();
    
    try {
      // Get backup file info
      const backupFile = backupSvc.getBackupFile(backupId);
      
      // Check if file exists and is readable
      const stats = fs.statSync(backupFile.filepath);
      
      if (!stats.isFile()) {
        throw new Error('Backup path is not a file');
      }

      // Try to read the file
      let content;
      if (backupFile.contentType === 'application/gzip') {
        const compressed = fs.readFileSync(backupFile.filepath);
        content = await gunzipAsync(compressed);
      } else {
        content = fs.readFileSync(backupFile.filepath);
      }

      const sqlContent = content.toString();
      
      // Basic validation checks
      if (sqlContent.length === 0) {
        throw new Error('Backup file is empty');
      }

      // Check for basic SQL structure
      const hasSQLStructure = sqlContent.includes('CREATE TABLE') || sqlContent.includes('INSERT INTO');
      if (!hasSQLStructure) {
        throw new Error('Backup file does not contain valid SQL structure');
      }

      // Check for MySQL dump header
      const isMySQLDump = sqlContent.includes('MySQL dump') || sqlContent.includes('mysqldump');
      
      return {
        valid: true,
        file: {
          name: backupFile.filename,
          size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString()
        },
        content: {
          type: isMySQLDump ? 'MySQL Dump' : 'SQL File',
          size: `${(sqlContent.length / 1024).toFixed(2)} KB`,
          hasCreateTable: sqlContent.includes('CREATE TABLE'),
          hasInsertData: sqlContent.includes('INSERT INTO')
        }
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = MySQLRestoreService;
