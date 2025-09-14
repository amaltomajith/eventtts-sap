import { Document, Schema, model, models } from "mongoose";

// --- THIS IS THE FIX ---
// Add the 'export' keyword to the interface definition
export interface IEvent extends Document {
  _id: string;
  title: string;
  description: string;
  location?: string;
  createdAt: Date;
  photo: string;
  startDate: Date;
  endDate: Date;
  price?: string;
  isFree: boolean;
  url?: string;
  category: { _id: string, name: string }
  organizer: { _id: string, firstName: string, lastName: string }
  ticketsLeft: number;
  totalCapacity: number;
  tags: { _id: string, name: string }[];
}


const EventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
  photo: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: Date.now },
  price: { type: String },
  isFree: { type: Boolean, default: false },
  url: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  organizer: { type: Schema.Types.ObjectId, ref: 'User' },
  ticketsLeft: { type: Number, default: 0 },
  totalCapacity: { type: Number, default: 0 },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
})

const Event = models.Event || model('Event', EventSchema);

export default Event;