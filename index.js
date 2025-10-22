require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/db");

// Import models after sequelize initialization
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");
const DigitalKey = require("./models/DigitalKey");

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");
const keyRoutes = require("./routes/keys");
const backupRoutes = require("./backup/routes/backupRoutes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Routes
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/users", userRoutes);
app.use("/keys", keyRoutes);
app.use("/backup", backupRoutes);

// Sync database and start server
sequelize.sync({ force: false, alter: false })
  .then(async () => {
    console.log("Database synced");
    const bcrypt = require("bcrypt");
    const adminEmail = "admin@site.test";
    
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (!existing) {
      const hash = await bcrypt.hash("admin123", 10);
      await User.create({
        email: adminEmail,
        passwordHash: hash,
        role: "admin",
        emailConfirmed: true
      });
      console.log("Seeded admin:", adminEmail, "password: admin123");
    }
    
    app.listen(PORT, () => console.log("Server running on port", PORT));
  })
  .catch((err) => {
    console.error("Failed to sync DB:", err);
  });
