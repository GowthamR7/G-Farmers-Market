const express = require('express');
const { createOrder, getCustomerOrders, getFarmerOrders } = require('../controllers/orderController');
const auth = require('../middleware/auth');
const router = express.Router();


router.post('/', auth, createOrder);


router.get('/my-orders', auth, getCustomerOrders);


router.get('/farmer-orders', auth, getFarmerOrders);

module.exports = router;
