const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (error) => {
  console.error('Unexpected database error', error);
});

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
        url: 'https://mobile-topup-store.onrender.com',
        description: 'Production Server (Render)',
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Local Development',
      },
    ],
    components: {
      schemas: {
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            txn_id: { type: 'string', example: 'TXN-1700000000000' },
            email: { type: 'string', example: 'qa@example.com' },
            package_name: { type: 'string', example: '5G Max Speed' },
            payment_method: {
              type: 'string',
              enum: ['credit_card', 'wallet', 'qr'],
              example: 'credit_card',
            },
            amount: { type: 'number', example: 1199 },
            status: { type: 'string', example: 'SUCCESS' },
            created_at: { type: 'string', example: '2026-01-21 11:05:00' },
          },
          required: ['id', 'txn_id', 'email', 'package_name', 'payment_method', 'amount', 'status', 'created_at'],
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

function createTransaction({ email, packageName, paymentMethod, amount, status }) {
  const timestamp = getThaiTimestamp();
  return {
    id: 'TXN-' + Date.now(),
    email,
    packageName,
    paymentMethod,
    amount,
    status,
    createdAt: timestamp,
  };
}

async function initDb() {
  const createUsersSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT
    );
  `;
  const createTransactionsSql = `
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      txn_id TEXT,
      email TEXT,
      package_name TEXT,
      payment_method TEXT,
      amount NUMERIC,
      status TEXT,
      created_at TEXT
    );
  `;

  await pool.query(createUsersSql);
  await pool.query(createTransactionsSql);
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
 *         description: Invalid payload or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/register', async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const password = String(req.body && req.body.password ? req.body.password : '').trim();

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  try {
    await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);
    return res.status(201).json({ status: 'success', message: 'Created' });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(400).json({ status: 'error', message: 'Email already registered' });
    }
    console.error('Register failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
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
app.post('/api/login', async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const password = String(req.body && req.body.password ? req.body.password : '').trim();

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  try {
    const result = await pool.query('SELECT password FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const storedPassword = String(result.rows[0].password || '');
    if (storedPassword !== password) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    return res.status(200).json({ token: 'mock-token' });
  } catch (error) {
    console.error('Login failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
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
app.post('/api/auth/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const newPassword = String(req.body && req.body.newPassword ? req.body.newPassword : '').trim();
  if (!email || !newPassword) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  try {
    const result = await pool.query('UPDATE users SET password = $1 WHERE email = $2', [newPassword, email]);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    return res.status(200).json({ status: 'success', message: 'Password updated' });
  } catch (error) {
    console.error('Reset password failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
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

  const respondSuccess = async () => {
    const transaction = createTransaction({
      email: emailValue,
      packageName: packageValue,
      paymentMethod: methodValue,
      amount: amountValue,
      status: 'SUCCESS',
    });

    try {
      await pool.query(
        `
          INSERT INTO transactions
            (txn_id, email, package_name, payment_method, amount, status, created_at)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          transaction.id,
          transaction.email,
          transaction.packageName,
          transaction.paymentMethod,
          transaction.amount,
          transaction.status,
          transaction.createdAt,
        ]
      );

      res.status(200).json({
        status: 'success',
        txnId: transaction.id,
        amount: transaction.amount,
      });
    } catch (error) {
      console.error('Topup insert failed', error);
      res.status(500).json({ status: 'error', message: 'Database error' });
    }
  };

  if (phoneValue.startsWith('088')) {
    return setTimeout(() => {
      respondSuccess();
    }, 5000);
  }

  return setTimeout(() => {
    respondSuccess();
  }, 1500);
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
app.get('/api/transactions', async (req, res) => {
  const email = normalizeEmail(req.query && req.query.email);
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Email query required' });
  }

  try {
    const result = await pool.query('SELECT * FROM transactions WHERE email = $1 ORDER BY id DESC', [email]);
    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch transactions failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
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
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE txn_id = $1 LIMIT 1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch transaction failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
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
app.put('/api/transactions/:id', async (req, res) => {
  const { status } = req.body || {};
  if (typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({ status: 'error', message: 'Invalid payload' });
  }

  const statusValue = status.trim().toUpperCase();

  try {
    const result = await pool.query(
      `
        UPDATE transactions
        SET status = $1
        WHERE txn_id = $2
        RETURNING *
      `,
      [statusValue, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Update transaction failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
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
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `
        DELETE FROM transactions
        WHERE txn_id = $1
        RETURNING *
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Delete transaction failed', error);
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Mobile TopUp Store running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database', error);
    process.exit(1);
  }
}

startServer();
