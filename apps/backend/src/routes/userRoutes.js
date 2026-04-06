const express = require('express');
const { searchUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.get('/search', searchUsers);

module.exports = router;
