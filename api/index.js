//this one oly for vercel deployment.we can delete this file if we want
//  to deploy on heroku or any other platform
const mysql = require("mysql2/promise");

module.exports = async (req, res) => {
  try {
    // Create a connection to the database
    let fullhost = `${process.env.DB_HOST}:${process.env.DB_PORT}`;
    const connection = await mysql.createConnection({
      host: fullhost,
      user: process.env.DB_USER,
      //   port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Execute a query
    const [rows] = await connection.execute(
      "SELECT * FROM your_table LIMIT 10"
    );

    // Close the connection
    await connection.end();

    // Return results
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};
