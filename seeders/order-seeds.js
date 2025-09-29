module.exports = [
  {
    id: 1,
    userId: 2, // John Doe
    productId: 1, // Microsoft Office 2024 Professional
    status: 'paid',
    paymentMethod: 'Credit Card',
    transactionId: 'TXN-001-2024',
    paymentSender: 'John Doe',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: 2,
    userId: 3, // Jane Smith
    productId: 2, // Adobe Photoshop CC 2024
    status: 'paid',
    paymentMethod: 'PayPal',
    transactionId: 'TXN-002-2024',
    paymentSender: 'Jane Smith',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11')
  },
  {
    id: 3,
    userId: 4, // Bob Johnson
    productId: 3, // Windows 11 Pro
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN-003-2024',
    paymentSender: 'Bob Johnson',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: 4,
    userId: 2, // John Doe (second order)
    productId: 4, // Norton 360 Premium
    status: 'paid',
    paymentMethod: 'Credit Card',
    transactionId: 'TXN-004-2024',
    paymentSender: 'John Doe',
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13')
  },
  {
    id: 5,
    userId: 3, // Jane Smith (second order)
    productId: 6, // AutoCAD 2024
    status: 'paid',
    paymentMethod: 'PayPal',
    transactionId: 'TXN-005-2024',
    paymentSender: 'Jane Smith',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 6,
    userId: 4, // Bob Johnson (second order)
    productId: 8, // Camtasia 2024
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN-006-2024',
    paymentSender: 'Bob Johnson',
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: 7,
    userId: 2, // John Doe (third order)
    productId: 5, // Final Cut Pro X
    status: 'awaiting_confirmation',
    paymentMethod: 'Credit Card',
    transactionId: 'TXN-007-2024',
    paymentSender: 'John Doe',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 8,
    userId: 3, // Jane Smith (third order)
    productId: 7, // VMware Workstation Pro
    status: 'pending',
    paymentMethod: null,
    transactionId: null,
    paymentSender: null,
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: 9,
    userId: 4, // Bob Johnson (third order)
    productId: 9, // Logic Pro X
    status: 'awaiting_confirmation',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN-009-2024',
    paymentSender: 'Bob Johnson',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: 10,
    userId: 2, // John Doe (fourth order)
    productId: 10, // QuickBooks Desktop Pro
    status: 'delivered',
    paymentMethod: 'Credit Card',
    transactionId: 'TXN-010-2024',
    paymentSender: 'John Doe',
    createdAt: new Date('2024-01-23'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: 11,
    userId: 3, // Jane Smith (fourth order)
    productId: 1, // Microsoft Office 2024 Professional
    status: 'cancelled',
    paymentMethod: 'PayPal',
    transactionId: 'TXN-011-2024',
    paymentSender: 'Jane Smith',
    createdAt: new Date('2024-01-24'),
    updatedAt: new Date('2024-01-24')
  },
  {
    id: 12,
    userId: 4, // Bob Johnson (fourth order)
    productId: 2, // Adobe Photoshop CC 2024
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN-012-2024',
    paymentSender: 'Bob Johnson',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  }
];
