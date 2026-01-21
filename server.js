const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let users = [];
let transactions = [];

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mobile TopUp Store API',
      version: '3.1.0',
      description: 'Sandbox API for QA automation practice.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local server',
      },
    ],
    components: {
      schemas: {
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'TXN-1700000000000' },
            email: { type: 'string', example: 'qa@example.com' },
            phone: { type: 'string', example: '0891234567' },
            package: { type: 'string', example: '5G Max Speed' },
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'wallet', 'qr'],
              example: 'credit_card',
            },
            amount: { type: 'number', example: 1199 },
            status: { type: 'string', example: 'SUCCESS' },
            timestamp: { type: 'string', example: '2026-01-21 11:05:00' },
          },
          required: ['id', 'email', 'phone', 'package', 'paymentMethod', 'amount', 'status', 'timestamp'],
        },
        TopUpRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'qa@example.com' },
            package: { type: 'string', example: '5G Max Speed' },
            phone: { type: 'string', example: '0891234567' },
            amount: { type: 'number', example: 1199 },
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'wallet', 'qr'],
              example: 'credit_card',
            },
          },
          required: ['email', 'package', 'phone', 'amount', 'paymentMethod'],
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'qa@example.com' },
            password: { type: 'string', example: 'pass1234' },
          },
          required: ['email', 'password'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'qa@example.com' },
            password: { type: 'string', example: 'pass1234' },
          },
          required: ['email', 'password'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'mock-token' },
          },
          required: ['token'],
        },
        OtpRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'qa@example.com' },
          },
          required: ['email'],
        },
        OtpVerifyRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'qa@example.com' },
            otp: { type: 'string', example: '1234' },
          },
          required: ['email', 'otp'],
        },
        ResetPasswordRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'qa@example.com' },
            newPassword: { type: 'string', example: 'newPass123' },
          },
          required: ['email', 'newPassword'],
        },
        UpdateStatusRequest: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'REFUNDED' },
          },
          required: ['status'],
        },
        BasicResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', example: 'Created' },
          },
          required: ['status'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Gateway error' },
          },
          required: ['status', 'message'],
        },
      },
    },
  },
  apis: [__filename],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getThaiTimestamp() {
  const raw = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok', hour12: false });
  return raw.replace('T', ' ').replace(',', '');
}

function createTransaction({ phone, email, packageName, paymentMethod, amount, status }) {
  const timestamp = getThaiTimestamp();
  return {
    id: 'TXN-' + Date.now(),
    email,
    phone,
    package: packageName,
    paymentMethod,
    amount,
    status,
    timestamp,
  };
}

/**
 * @openapi
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       '201':
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasicResponse'
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/register', (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const password = String(req.body && req.body.password ? req.body.password : '').trim();

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  const exists = users.some((user) => user.email === email);
  if (exists) {
    return res.status(409).json({ status: 'error', message: 'Email already registered' });
  }

  users.push({ email, password });
  return res.status(201).json({ status: 'success', message: 'Created' });
});

/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/login', (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const password = String(req.body && req.body.password ? req.body.password : '').trim();

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  const user = users.find((entry) => entry.email === email && entry.password === password);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  return res.status(200).json({ token: 'mock-token' });
});

/**
 * @openapi
 * /api/auth/otp/request:
 *   post:
 *     summary: Request a password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpRequest'
 *     responses:
 *       '200':
 *         description: OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasicResponse'
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/auth/otp/request', (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }
  return res.status(200).json({ status: 'success', message: 'OTP sent' });
});

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     summary: Verify a password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpVerifyRequest'
 *     responses:
 *       '200':
 *         description: OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasicResponse'
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/auth/otp/verify', (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const otp = String(req.body && req.body.otp ? req.body.otp : '').trim();
  if (!email || !otp) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }
  if (otp !== '1234') {
    return res.status(401).json({ status: 'error', message: 'Invalid OTP' });
  }
  return res.status(200).json({ status: 'success', message: 'OTP verified' });
});

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset a user password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       '200':
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasicResponse'
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/auth/reset-password', (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const newPassword = String(req.body && req.body.newPassword ? req.body.newPassword : '').trim();
  if (!email || !newPassword) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }
  const user = users.find((entry) => entry.email === email);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found' });
  }
  user.password = newPassword;
  return res.status(200).json({ status: 'success', message: 'Password updated' });
});

/**
 * @openapi
 * /api/topup:
 *   post:
 *     summary: Perform a top-up payment
 *     description: Simulates gateway behavior for QA testing scenarios.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TopUpRequest'
 *     responses:
 *       '200':
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 txnId:
 *                   type: string
 *                   example: TXN-1700000000000
 *                 amount:
 *                   type: number
 *                   example: 1199
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Gateway error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/topup', (req, res) => {
  const { phone, amount, paymentMethod, email, package: packageName } = req.body || {};
  const emailValue = normalizeEmail(email);
  const phoneValue = String(phone || '').trim();
  const packageValue = String(packageName || '').trim();
  const amountValue = Number(amount);
  const methodValue = String(paymentMethod || '').trim();

  if (!emailValue || !packageValue || !phoneValue || Number.isNaN(amountValue) || !methodValue) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  // Mock payment gateway behaviors:
  // 1) 099 prefix -> immediate gateway error (HTTP 500).
  // 2) 088 prefix -> 5s delay to mimic timeout behavior.
  // 3) All others -> 1.5s delay then success.
  if (phoneValue.startsWith('099')) {
    return res.status(500).json({ status: 'error', message: 'Gateway error' });
  }

  const respondSuccess = () => {
    const transaction = createTransaction({
      phone: phoneValue,
      email: emailValue,
      packageName: packageValue,
      paymentMethod: methodValue,
      amount: amountValue,
      status: 'SUCCESS',
    });
    transactions.push(transaction);
    res.status(200).json({
      status: 'success',
      txnId: transaction.id,
      amount: transaction.amount,
    });
  };

  if (phoneValue.startsWith('088')) {
    return setTimeout(respondSuccess, 5000);
  }

  return setTimeout(respondSuccess, 1500);
});

/**
 * @openapi
 * /api/transactions:
 *   get:
 *     summary: Get transactions for a user
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       '400':
 *         description: Missing email query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/transactions', (req, res) => {
  const email = normalizeEmail(req.query && req.query.email);
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Email query required' });
  }
  const filtered = transactions
    .filter((item) => item.email === email)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return res.json(filtered);
});

/**
 * @openapi
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a transaction by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Transaction detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       '404':
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/transactions/:id', (req, res) => {
  const transaction = transactions.find((item) => item.id === req.params.id);
  if (!transaction) {
    return res.status(404).json({ status: 'error', message: 'Transaction not found' });
  }
  return res.json(transaction);
});

/**
 * @openapi
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusRequest'
 *     responses:
 *       '200':
 *         description: Updated transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       '400':
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.put('/api/transactions/:id', (req, res) => {
  const { status } = req.body || {};
  if (typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  const transaction = transactions.find((item) => item.id === req.params.id);
  if (!transaction) {
    return res.status(404).json({ status: 'error', message: 'Transaction not found' });
  }

  transaction.status = status.trim().toUpperCase();
  return res.json(transaction);
});

/**
 * @openapi
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Deleted transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       '404':
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete('/api/transactions/:id', (req, res) => {
  const index = transactions.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Transaction not found' });
  }

  const [deleted] = transactions.splice(index, 1);
  return res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Mobile TopUp Store running on http://localhost:${PORT}`);
});
