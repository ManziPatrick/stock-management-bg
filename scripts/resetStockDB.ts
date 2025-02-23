import mongoose from 'mongoose';

class SimpleDatabaseReset {
  private readonly uri = 'mongodb://localhost:27017/Stock-Management';
  
  private async createIndexes(collection: mongoose.Collection): Promise<void> {
    try {
      await collection.createIndex({ name: 1 });
      await collection.createIndex({ category: 1 });
      await collection.createIndex({ seller: 1 });
      await collection.createIndex({ user: 1 });
      console.log('Indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  private async testWriteAccess(collection: mongoose.Collection): Promise<void> {
    try {
      const testDoc = await collection.insertOne({
        name: "Test Product",
        createdAt: new Date(),
        test: true
      });
      console.log('Write test successful:', testDoc.acknowledged);

      await collection.deleteOne({ test: true });
      console.log('Test cleanup successful');
    } catch (error) {
      console.error('Write test failed:', error);
      throw error;
    }
  }

  public async reset(): Promise<void> {
    try {
      // Connect to MongoDB
      await mongoose.connect(this.uri);
      console.log('Connected to Stock-Management database');

      const collection = mongoose.connection.collection('products');

      // Drop collection if exists
      try {
        await collection.drop();
        console.log('Products collection dropped');
      } catch (error) {
        console.log('Collection might not exist, continuing...');
      }

      // Recreate collection
      await mongoose.connection.createCollection('products');
      console.log('Products collection recreated');

      // Create indexes
      await this.createIndexes(collection);

      // Test write access
      await this.testWriteAccess(collection);

    } catch (error) {
      console.error('Database reset failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

// Run the reset
const dbReset = new SimpleDatabaseReset();
dbReset.reset()
  .then(() => {
    console.log('Database reset completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to reset database:', error);
    process.exit(1);
  });