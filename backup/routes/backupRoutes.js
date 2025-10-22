const express = require('express');
const router = express.Router();
const SimpleBackupService = require('../services/simpleBackupService');
const DataService = require('../services/dataService');
const { authRequired, requireRole } = require('../../middleware/auth');

// Initialize services
const backupService = new SimpleBackupService();
const dataService = new DataService();

// ===== BACKUP ROUTES =====

// Get database statistics
router.get('/stats', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const stats = await dataService.getDatabaseStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get database stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of all tables
router.get('/tables', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const tables = await dataService.getAllTableDetails();
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('Failed to get tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific table information
router.get('/tables/:tableName', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const tableInfo = await dataService.getTableDetails(tableName);
    res.json({
      success: true,
      data: tableInfo
    });
  } catch (error) {
    console.error(`Failed to get table info for ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create full database backup
router.post('/create/full', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const options = req.body || {};
    const result = await backupService.createFullBackup(options);
    res.json(result);
  } catch (error) {
    console.error('Failed to create full backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create table-specific backup
router.post('/create/tables', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tables, options = {} } = req.body;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: 'Tables array is required' });
    }

    const result = await backupService.createTableBackup(tables, options);
    res.json(result);
  } catch (error) {
    console.error('Failed to create table backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create data-only backup
router.post('/create/data', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tables, options = {} } = req.body;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: 'Tables array is required' });
    }

    const result = await backupService.createDataOnlyBackup(tables, options);
    res.json(result);
  } catch (error) {
    console.error('Failed to create data backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of all backups
router.get('/list', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const backups = backupService.getBackupList();
    res.json({
      success: true,
      data: backups.reverse() // Most recent first
    });
  } catch (error) {
    console.error('Failed to get backup list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download backup file
router.get('/download/:backupId', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = backupService.getBackupFile(backupId);
    
    res.setHeader('Content-Disposition', `attachment; filename="${backupFile.filename}"`);
    res.setHeader('Content-Type', backupFile.contentType);
    
    const fs = require('fs');
    const fileStream = fs.createReadStream(backupFile.filepath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Failed to download backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:backupId', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { backupId } = req.params;
    const result = await backupService.deleteBackup(backupId);
    res.json(result);
  } catch (error) {
    console.error('Failed to delete backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== RESTORE ROUTES (DISABLED) =====

// Note: Restore functionality is disabled for now
// JSON backups can be manually restored if needed

// ===== DATA MANAGEMENT ROUTES =====

// Clear table (truncate)
router.post('/data/clear/:tableName', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const options = req.body || {};
    const result = await dataService.clearTable(tableName, options);
    res.json(result);
  } catch (error) {
    console.error(`Failed to clear table ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete records with conditions
router.post('/data/delete/:tableName', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { conditions, options = {} } = req.body;
    
    if (!conditions || Object.keys(conditions).length === 0) {
      return res.status(400).json({ error: 'Conditions object is required' });
    }

    const result = await dataService.deleteRecords(tableName, conditions, options);
    res.json(result);
  } catch (error) {
    console.error(`Failed to delete records from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete old records
router.post('/data/delete-old/:tableName', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { dateColumn, daysOld, options = {} } = req.body;
    
    if (!dateColumn || !daysOld) {
      return res.status(400).json({ error: 'dateColumn and daysOld are required' });
    }

    const result = await dataService.deleteOldRecords(tableName, dateColumn, daysOld, options);
    res.json(result);
  } catch (error) {
    console.error(`Failed to delete old records from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Archive records
router.post('/data/archive/:tableName', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { conditions, options = {} } = req.body;
    
    if (!conditions || Object.keys(conditions).length === 0) {
      return res.status(400).json({ error: 'Conditions object is required' });
    }

    const result = await dataService.archiveRecords(tableName, conditions, options);
    res.json(result);
  } catch (error) {
    console.error(`Failed to archive records from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get table row count
router.get('/data/count/:tableName', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const count = await dataService.getTableRowCount(tableName);
    res.json({
      success: true,
      data: {
        table: tableName,
        rowCount: count
      }
    });
  } catch (error) {
    console.error(`Failed to get row count for ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get data operations history
router.get('/data/history', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const history = dataService.getOperationsHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Failed to get operations history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== UTILITY ROUTES =====

// Test database connection
router.get('/test-connection', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const config = backupService.getDBConfig();
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const command = `mysql -h${config.host} -P${config.port} -u${config.user} -p${config.password} -e "SELECT 1;" ${config.database}`;
    await execAsync(command);
    
    res.json({
      success: true,
      message: 'Database connection successful',
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user
      }
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      details: error.message 
    });
  }
});

// Get system information
router.get('/system-info', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const backupDir = path.join(__dirname, '../backups');
    let backupDirSize = 0;
    let backupCount = 0;
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      backupCount = files.filter(file => file.endsWith('.sql') || file.endsWith('.gz')).length;
      
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        backupDirSize += stats.size;
      });
    }
    
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      backupDirectory: {
        path: backupDir,
        exists: fs.existsSync(backupDir),
        fileCount: backupCount,
        totalSize: `${(backupDirSize / (1024 * 1024)).toFixed(2)} MB`
      }
    };
    
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Failed to get system info:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
