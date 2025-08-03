import mongoose from 'mongoose';
import Product from '../src/modules/product/product.model';
import config from '../src/config';

/**
 * Migration script to add default_price field to existing products
 * This script will set default_price equal to the current price for all existing products
 */

async function migrateDefaultPrice() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.database_url as string);
    console.log('Connected to MongoDB');

    // Find all products that don't have default_price field
    const productsToUpdate = await Product.find({
      default_price: { $exists: false }
    });

    console.log(`Found ${productsToUpdate.length} products to update`);

    if (productsToUpdate.length === 0) {
      console.log('No products need migration');
      return;
    }

    // Update each product to set default_price equal to current price
    const updatePromises = productsToUpdate.map(async (product) => {
      const defaultPrice = product.price || 0;
      
      await Product.findByIdAndUpdate(product._id, {
        default_price: defaultPrice
      });

      console.log(`Updated product: ${product.name} - Set default_price to ${defaultPrice}`);
    });

    await Promise.all(updatePromises);

    console.log(`Successfully migrated ${productsToUpdate.length} products`);
    
    // Verify the migration
    const verificationCount = await Product.countDocuments({
      default_price: { $exists: true }
    });
    
    const totalCount = await Product.countDocuments();
    
    console.log(`Verification: ${verificationCount}/${totalCount} products now have default_price field`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  migrateDefaultPrice()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateDefaultPrice;