// api/mysql-connection.js
const mysql = require("mysql2/promise");

module.exports = async (req, res) => {
  // Set CORS headers for cross-origin requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Create connection to your Contabo VPS MySQL
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 6670, // Your MySQL port (6670)
      user: process.env.DB_USER, //
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "goods", // Your database name
      connectTimeout: 60000, // Increase timeout for serverless
      timeout: 60000, // Increase timeout
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });

    // Test the connection with a simple query
    const [rows] = await connection.execute("SELECT 1 as connection_test");

    // Close the connection
    await connection.end();

    // Return success response
    res.status(200).json({
      success: true,
      message: "Database connection successful",
      data: rows,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Check your VPS firewall and MySQL user permissions",
    });
  }
};
