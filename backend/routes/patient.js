const express = require('express');
const router = express.Router();

// Placeholder patient routes
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Patient route placeholder' });
});

module.exports = router;
