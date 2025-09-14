import { Schema, model, models, Document, Types } from "mongoose";

export interface IEvent extends Document {
    title: string;
    description: string;
    photo: string;
    isOnline: boolean;
    location: string;
    landmark: string;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    duration?: number;
    totalCapacity: number;
    isFree: boolean;
    price: number;
    category: Types.ObjectId;
    tags: Types.ObjectId[];
    organizer: Types.ObjectId;
    attendees: Types.ObjectId[];
    ticketsLeft: number;
    soldOut: boolean;
    ageRestriction: number;
    url?: string;
    parentEvent?: Types.ObjectId;
    subEvents: Types.ObjectId[];
    eventType?: string;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
}

const eventSchema = new Schema<IEvent>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    photo: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    location: { type: String },
    landmark: { type: String, default: "Virtual" },
    startDate: { type: Date, required: true, field: 'start_date' },
    endDate: { type: Date, required: true, field: 'end_date' },
    startTime: { type: String, required: true, field: 'start_time' },
    endTime: { type: String, required: true, field: 'end_time' },
    duration: { type: Number },
    // isMultipleDays: { type: Boolean, required: true, default: false },
    totalCapacity: { type: Number, default: 0, field: 'total_capacity' },
    isFree: { type: Boolean, required: true, default: false, field: 'is_free' },
    price: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, field: 'category_id' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, field: 'organizer_id' },
    attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    ticketsLeft: { type: Number, default: 0, field: 'tickets_left' },
    soldOut: { type: Boolean, default: false, field: 'sold_out' },
    ageRestriction: { type: Number, default: 0, field: 'age_restriction' },
    url: { type: String, field: 'event_url' },
    parentEvent: { type: Schema.Types.ObjectId, ref: 'Event' },
    subEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    eventType: { type: String, default: 'main', field: 'event_type' },
    status: { type: String, default: 'published', field: 'status' },
},
    {
        timestamps: true
    }
);

const Event = models.Event || model<IEvent>('Event', eventSchema);

export default Event;

export type EventDocument = IEvent & Document;