// src/utils/generateDeliveryNoteId.ts
import Counter from '../deliveryNote/Counter.model';

export const getNextDeliveryNoteId = async (): Promise<string> => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'deliveryNoteId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  const paddedSeq = counter.seq.toString().padStart(4, '0');
  return `DN-${paddedSeq}`;
};
