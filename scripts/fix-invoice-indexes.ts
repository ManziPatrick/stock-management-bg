import mongoose from 'mongoose';
import { config } from 'dotenv';

config(); // Load environment variables

async function fixInvoiceIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL|| 'mongodb://localhost:27017/Stock-Management');
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    // Drop the problematic index
    try {
      await db.collection('proformas').dropIndex('invoiceNo_1');
      console.log('Successfully dropped old index');
    } catch (err: any) {
      // Type assertion for error
      const error = err as Error;
      console.log('Index might not exist, continuing...', error?.message || 'Unknown error');
    }

    // Update documents with null invoice numbers
    const result = await db.collection('proformas').updateMany(
      { "invoiceDetails.invoiceNo": null },
      { $set: { "invoiceDetails.invoiceNo": `LEGACY-${new mongoose.Types.ObjectId()}` } }
    );

    console.log(`Updated ${result.modifiedCount} documents`);

    // Create new index
    await db.collection('proformas').createIndex(
      { "invoiceDetails.invoiceNo": 1 },
      { unique: true, sparse: true }
    );

    console.log('Successfully created new index');

  } catch (err: any) {
    // Type assertion for the general error
    const error = err as Error;
    console.error('Error:', error?.message || 'Unknown error');
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixInvoiceIndexes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});