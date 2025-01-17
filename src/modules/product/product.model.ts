import { Schema, model } from 'mongoose';
import { IMeasurement, IProduct } from './product.interface';

const measurementSchema = new Schema<IMeasurement>({
  type: { 
    type: String, 
    enum: ['weight', 'length', 'volume', 'size', 'pieces'],
    required: true 
  },
  value: { 
    type: Number,
    required: function(this: IMeasurement) {
      return this.type !== 'size';
    }
  },
  unit: { 
    type: String, 
    required: true,
    validate: {
      validator: function(this: IMeasurement, unit: string) {
        const unitMappings = {
          weight: ['g', 'kg', 'lb'],
          length: ['cm', 'm', 'inch'],
          volume: ['ml', 'l', 'oz'],
          pieces: ['pc', 'dozen', 'set'],
          size: ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'XXL', 'XXXL',
                 'EU_36', 'EU_37', 'EU_38', 'EU_39', 'EU_40', 'EU_41', 'EU_42', 
                 'EU_43', 'EU_44', 'EU_45', 'EU_46', 'EU_47']
        };
        return unitMappings[this.type].includes(unit);
      },
      message: 'Invalid unit for the selected measurement type'
    }
  }
});

const productSchema = new Schema<IProduct>(
  {
    user: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      ref: 'user' 
    },
    seller: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      ref: 'Seller' 
    },
    category: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      ref: 'category' 
    },
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    measurement: measurementSchema,
    brand: { 
      type: Schema.Types.ObjectId, 
      ref: 'brand' 
    },
    price: { 
      type: Number, 
      required: true,
      min: [0, 'Price cannot be negative'] 
    },
    stock: { 
      type: Number, 
      required: true,
      min: [0, 'Stock cannot be negative'] 
    },
    description: { 
      type: String,
      trim: true 
    },
    images: {
      type: [String], // Array of image URLs
      required: [true, 'At least one product image is required'],
      validate: {
        validator: function(v: string[]) {
          return v.length > 0 && v.length <= 5; // Ensure 1-5 images
        },
        message: 'Product must have between 1 and 5 images'
      }
    }
  },
  { 
    timestamps: true,
    toJSON: {
      virtuals: true
    }
  }
);

// Add indices for common queries
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ price: 1 });

// Add a compound index for category and price for filtered searches
productSchema.index({ category: 1, price: 1 });

const Product = model<IProduct>('product', productSchema);
export default Product;