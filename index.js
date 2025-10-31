require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/db");

// Import models after sequelize initialization
const { User, Product, Order, DigitalKey, SystemConfig, Permission, Refund, PromoCode } = require("./models");

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");
const keyRoutes = require("./routes/keys");
const backupRoutes = require("./backup/routes/backupRoutes");
const promoCodeRoutes = require("./routes/promoCodes");

const app = express();
const PORT = process.env.PORT || 4002;

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
app.use("/promo-codes", promoCodeRoutes);

// Sync database and start server
// Sync tables in specific order to handle foreign key constraints
sequelize.sync({ force: false, alter: false })
  .then(async () => {
    console.log("Database synced");
    
    // Initialize default system configurations
    try {
      await SystemConfig.initializeDefaultConfigs();
      console.log("System configurations initialized");
    } catch (error) {
      console.error("Error initializing system configs:", error.message);
    }
    
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
