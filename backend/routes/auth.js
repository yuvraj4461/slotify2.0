const express = require('express');
const router = express.Router();

// Placeholder auth routes
router.post('/login', (req, res) => {
  res.json({ success: true, message: 'Login placeholder' });
});

module.exports = router;
