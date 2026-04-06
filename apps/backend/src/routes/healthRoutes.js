const express = require('express');
const { getHealth } = require('../controllers/healthController');
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: System Health Check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *       503:
 *         description: System is unhealthy
 */
router.get('/', getHealth);

module.exports = router;
