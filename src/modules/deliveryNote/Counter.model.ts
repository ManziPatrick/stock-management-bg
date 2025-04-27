// src/models/Counter.model.ts
import mongoose, { Schema, Document } from 'mongoose';

interface ICounter extends Document {
  _id: string;
  seq: number;
}

const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
export default Counter;
