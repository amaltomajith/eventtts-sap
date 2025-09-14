import { Schema, model, models, Document } from "mongoose";

export interface IEvent extends Document {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: Date;
  imageUrl: string;
  startDate: Date;
  endDate: Date;
  price?: number;
  isFree: boolean;
  url?: string;
  category: { _id: string; name: string };
  organizer: { _id: string; firstName: string; lastName: string; clerkId: string; };
  landmark?: string;
  startTime: string;
  endTime: string;
  photo: string;
  // ✅ Add tags to the interface
  tags: { _id: string; name: string }[];
}

const EventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
  imageUrl: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  price: { type: Number },
  isFree: { type: Boolean, default: false },
  url: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  organizer: { type: Schema.Types.ObjectId, ref: 'User' },
  landmark: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  photo: { type: String, required: true },
  // ✅ Add tags to the schema, referencing the 'Tag' model
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
});

const Event = models.Event || model('Event', EventSchema);

export default Event;