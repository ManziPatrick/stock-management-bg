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
    user: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    seller: { type: Schema.Types.ObjectId, required: true, ref: 'Seller' },
    category: { type: Schema.Types.ObjectId, required: true, ref: 'category' },
    name: { type: String, required: true },
    measurement: measurementSchema,
    brand: { type: Schema.Types.ObjectId, ref: 'brand' },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    description: { type: String }
  },
  { timestamps: true }
);

const Product = model<IProduct>('product', productSchema);
export default Product;