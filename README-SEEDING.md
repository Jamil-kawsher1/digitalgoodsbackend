# Database Migration and Seeding Guide

This guide explains how to set up your database with migrations and seed data for the DigiStore backend.

## Available Scripts

### Migration Scripts
- `npm run migrate` - Run database migrations to create/update tables
- `npm run seed` - Populate database with demo data
- `npm run setup` - Run both migrations and seeding (recommended for initial setup)
- `npm run setup:dev` - Run migrations, seeding, and start development server

## Quick Start

### 1. Initial Database Setup
```bash
# Run migrations and seed the database in one command
npm run setup
```

### 2. Development Setup
```bash
# Run migrations, seed data, and start the development server
npm run setup:dev
```

### 3. Individual Operations
```bash
# Only run migrations (if you have existing data)
npm run migrate

# Only seed data (if tables already exist)
npm run seed
```

## Seed Data Overview

### Users (5 records)
- **Admin User**: `admin@digistore.com` / `admin123`
- **John Doe**: `john@example.com` / `customer123`
- **Jane Smith**: `jane@example.com` / `customer123`
- **Bob Johnson**: `bob@example.com` / `customer123`
- **Alice Williams**: `alice@example.com` / `customer123` (unconfirmed for testing)

### Products (10 records)
1. Microsoft Office 2024 Professional - $299.99
2. Adobe Photoshop CC 2024 - $239.88
3. Windows 11 Pro - $199.99
4. Norton 360 Premium - $149.99
5. Final Cut Pro X - $299.99
6. AutoCAD 2024 - $1,775.00
7. VMware Workstation Pro - $199.99
8. Camtasia 2024 - $249.99
9. Logic Pro X - $199.99
10. QuickBooks Desktop Pro - $549.99

### Digital Keys (20 records)
- Mix of assigned and unassigned keys
- Realistic license key formats
- Proper product associations

### Orders (12 records)
- Various order statuses (pending, paid, delivered, cancelled, awaiting_confirmation)
- Different payment methods (Credit Card, PayPal, Bank Transfer)
- Multiple orders per customer to demonstrate relationships

## Database Schema

The seeding creates the following tables with relationships:
- **Users** → **Orders** (one-to-many)
- **Products** → **Orders** (one-to-many)
- **Products** → **DigitalKeys** (one-to-many)
- **Orders** → **DigitalKeys** (one-to-many via assignedToOrderId)

## Testing the API

After running the setup, you can test the API with these endpoints:

### Authentication
```bash
# Login as admin
curl -X POST http://localhost:4002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@digistore.com","password":"admin123"}'

# Login as customer
curl -X POST http://localhost:4002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"customer123"}'
```

### Products
```bash
# Get all products
curl http://localhost:4002/products

# Get single product
curl http://localhost:4002/products/1
```

### Orders (Admin)
```bash
# Get all orders with associations
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:4002/orders
```

### Orders (Customer)
```bash
# Get customer's orders
curl -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  http://localhost:4002/orders
```

## Manual Database Reset

If you need to completely reset the database:

1. Drop all tables from your database manually
2. Run `npm run setup` to recreate and seed

## Environment Variables

Make sure your `.env` file is configured with database connection settings:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `index.js` or kill the process using the port
2. **Database connection errors**: Verify your `.env` file and database server status
3. **Migration fails**: Ensure database exists and user has proper permissions
4. **Seed errors**: Check that migrations ran successfully first

### Debug Mode

For detailed logging, you can modify the `seeders/index.js` file to add more console.log statements or increase Sequelize logging in `config/db.js`.

## Production Considerations

For production environments:
1. Use environment-specific seed data
2. Remove or secure sensitive seed data (like real email addresses)
3. Consider using proper migration tools like Sequelize CLI for complex migrations
4. Always backup production data before running migrations or seeding

## File Structure

```
├── seeders/
│   ├── index.js              # Main seed runner
│   ├── user-seeds.js         # User seed data
│   ├── product-seeds.js      # Product seed data
│   ├── digitalkey-seeds.js   # Digital key seed data
│   └── order-seeds.js        # Order seed data
├── migrate.js                # Migration script
├── package.json              # NPM scripts
└── README-SEEDING.md         # This file
```

## Contributing

When adding new seed data:
1. Create appropriate seed files in the `seeders/` directory
2. Import and use the seed data in `seeders/index.js`
3. Update this documentation
4. Test the seeding process thoroughly
