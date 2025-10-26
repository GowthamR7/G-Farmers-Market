const express = require('express');
const { getFarmingAdvice, generateDescription, healthCheck } = require('../controllers/geminiController');
const router = express.Router();

router.post('/farming-advice', getFarmingAdvice);
router.post('/generate-description', generateDescription);
router.get('/health', healthCheck);

module.exports = router;
