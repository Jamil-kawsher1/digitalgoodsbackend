module.exports = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@digistore.com',
    password: 'admin123',
    role: 'admin',
    emailConfirmed: true,
    confirmationCode: null,
    confirmationCodeExpires: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'customer123',
    role: 'customer',
    emailConfirmed: true,
    confirmationCode: null,
    confirmationCodeExpires: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 3,
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'customer123',
    role: 'customer',
    emailConfirmed: true,
    confirmationCode: null,
    confirmationCodeExpires: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  },
  {
    id: 4,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    password: 'customer123',
    role: 'customer',
    emailConfirmed: true,
    confirmationCode: null,
    confirmationCodeExpires: null,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04')
  },
  {
    id: 5,
    name: 'Alice Williams',
    email: 'alice@example.com',
    password: 'customer123',
    role: 'customer',
    emailConfirmed: false, // Unconfirmed user for testing
    confirmationCode: '123456',
    confirmationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
];
