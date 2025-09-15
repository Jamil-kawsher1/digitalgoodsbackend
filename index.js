require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const DigitalKey = require('./models/DigitalKey');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/users', userRoutes);

sequelize.sync({ alter: true }).then(async () => {
  console.log('Database synced');
  const bcrypt = require('bcrypt');
  const adminEmail = 'admin@site.test';
  const existing = await User.findOne({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ email: adminEmail, passwordHash: hash, role: 'admin' });
    console.log('Seeded admin:', adminEmail, 'password: admin123');
  }
  app.listen(PORT, () => console.log('Server running on port', PORT));
}).catch(err => {
  console.error('Failed to sync DB', err);
});
