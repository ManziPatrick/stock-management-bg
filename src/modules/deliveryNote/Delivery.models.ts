import mongoose, { Schema, Document } from 'mongoose';
import { IDeliveryNote } from './Delivery.interface';

const DeliveryNoteSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    particulars: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  deliveredBy: {
    type: String,
    trim: true
  },
  receivedBy: {
    type: String,
    trim: true
  },
  proofOfDeliveryUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveredAt: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret.id || ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// ✅ Keep only the necessary indexes
DeliveryNoteSchema.index({ customerName: 1 });
DeliveryNoteSchema.index({ date: 1 });
DeliveryNoteSchema.index({ status: 1 });

const DeliveryNote = mongoose.models.DeliveryNote || mongoose.model<IDeliveryNote & Document>('DeliveryNote', DeliveryNoteSchema);

export default DeliveryNote;
