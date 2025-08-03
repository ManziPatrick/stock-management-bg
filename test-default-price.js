// Simple test script to verify the default_price implementation
const mongoose = require('mongoose');

// Test the price filtering functionality
const { filterPriceFields } = require('./src/middlewares/priceFilter');

// Test data
const productWithPrices = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Product',
  price: 100, // Original price - should be hidden from non-admins
  default_price: 150, // Default price - visible to all
  stock: 50,
  description: 'Test product description'
};

const productsArray = [
  productWithPrices,
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Another Product',
    price: 200,
    default_price: 250,
    stock: 30
  }
];

console.log('=== Testing Price Filtering ===\n');

// Test for ADMIN user (should see both prices)
console.log('ADMIN user view:');
console.log('Single product:', JSON.stringify(filterPriceFields(productWithPrices, 'ADMIN'), null, 2));
console.log('Products array:', JSON.stringify(filterPriceFields(productsArray, 'ADMIN'), null, 2));

console.log('\n' + '='.repeat(50) + '\n');

// Test for KEEPER user (should not see original price)
console.log('KEEPER user view:');
console.log('Single product:', JSON.stringify(filterPriceFields(productWithPrices, 'KEEPER'), null, 2));
console.log('Products array:', JSON.stringify(filterPriceFields(productsArray, 'KEEPER'), null, 2));

console.log('\n' + '='.repeat(50) + '\n');

// Test for USER (should not see original price)
console.log('USER view:');
console.log('Single product:', JSON.stringify(filterPriceFields(productWithPrices, 'USER'), null, 2));
console.log('Products array:', JSON.stringify(filterPriceFields(productsArray, 'USER'), null, 2));

console.log('\n=== Test Complete ===');