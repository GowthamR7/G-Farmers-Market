const express = require('express');
const { getAllProducts, getProductById, createProduct } = require('../controllers/productController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', auth, createProduct);

module.exports = router;
