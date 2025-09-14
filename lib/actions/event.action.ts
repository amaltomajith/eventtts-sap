"use server"

import { connectToDatabase } from "../dbconnection";
import Category from "../models/category.model";
import Event, { IEvent } from "../models/event.model";
import Tag from "../models/tag.model";
import User from "../models/user.model";
import Order from '../models/order.model';
import { FilterQuery, Types, Document } from 'mongoose';
import { revalidatePath } from "next/cache";

// Type for event query
type EventQuery = FilterQuery<IEvent> & {
    parentEvent?: { $exists: boolean } | Types.ObjectId | string;
};

// Type for event query parameters
type GetEventsParams = {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
};

// Alias for backward compatibility
type EventSearchQuery = EventQuery;

// Type for event update data
type EventUpdateData = Partial<{
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
    duration: number;
    totalCapacity: number;
    isFree: boolean;
    price: number;
    category: Types.ObjectId;
    tags: Types.ObjectId[];
    ticketsLeft: number;
    soldOut: boolean;
    url: string;
    parentEvent: Types.ObjectId | null;
}>;

// Type for the event with populated sub-events
export type EventWithSubEvents = Omit<IEvent, keyof Document | 'subEvents'> & {
    _id: Types.ObjectId;
    subEvents?: IEvent[];
};

export async function createEvent(eventData: any) {
    try {
        await connectToDatabase();

        let data = eventData;

        data.ticketsLeft = data.totalCapacity;
        data.eventType = 'main'; // Mark as main event
        data.status = 'published'; // Default status

        const category = await Category.findOne({ name: data.category });

        if (!category) {
            const newCategory = await Category.create({ name: data.category });
            data.category = newCategory._id;
        } else {
            data.category = category._id;
        }

        const tagsId: any = [];

        for (const tag of data.tags) {
            const tagExists = await Tag.findOne({ name: tag });

            if (!tagExists) {
                const newTag = await Tag.create({ name: tag });
                tagsId.push(newTag._id);
            } else {
                tagsId.push(tagExists._id);
            }
        };

        data.tags = tagsId;

        const { subEvents, ...mainEventData } = data;

        const mainEvent = await Event.create(mainEventData);

        if (subEvents && subEvents.length > 0) {
            const subEventIds = [];

            for (const subEventData of subEvents) {
                const newSubEvent = {
                    ...subEventData,
                    parentEvent: mainEvent._id,
                    organizer: mainEvent.organizer,
                    category: mainEvent.category,
                    photo: subEventData.photo || mainEvent.photo,
                    // Subevents should not have their own ticket pool - they share parent's tickets
                    totalCapacity: 0, // No individual capacity for subevents
                    ticketsLeft: 0,   // No individual tickets for subevents
                    soldOut: false,   // Sold out status comes from parent
                    eventType: 'sub', // Mark as sub-event
                    status: 'published', // Default status
                };
                const subEvent = await Event.create(newSubEvent);
                subEventIds.push(subEvent._id);
            }

            mainEvent.subEvents = subEventIds;
            await mainEvent.save();
        }

        const event = mainEvent;

        event.tags.forEach(async (tag: any) => {
            const tagExists = await Tag.findById(tag);

            if (tagExists) {
                tagExists.events.push(event._id);
                await tagExists.save();
            }
            else {
                await Tag.create({ name: tag, events: [event._id] });
            }
        });

        revalidatePath("/");

        return JSON.parse(JSON.stringify(event));
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function getEvents({ query = '', category = '', page = 1, limit = 6 }: GetEventsParams) {
    try {
        await connectToDatabase();

        const skipAmount = (Number(page) - 1) * limit;

        const searchQuery: EventQuery = {} as EventQuery;

        if (query) {
            searchQuery.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { location: { $regex: query, $options: 'i' } },
                { landmark: { $regex: query, $options: 'i' } },
            ].filter(Boolean) as FilterQuery<IEvent>['$or'];
        }

        if (category) {
            const categoryDoc = await Category.findOne({ name: category });
            if (categoryDoc) {
                searchQuery.category = categoryDoc._id;
            }
        }

        // Only get main events (not sub-events) for the listing
        searchQuery.parentEvent = { $exists: false };

        const events = await Event.find(searchQuery)
            .populate("category", "name")
            .populate("organizer", "firstName lastName email")
            .populate("tags", "name")
            .sort({ createdAt: -1 })
            .skip(skipAmount)
            .limit(limit)
            .lean<IEvent[]>();

        const total = await Event.countDocuments(searchQuery);
        const totalPages = Math.ceil(total / limit);

        return { events: JSON.parse(JSON.stringify(events)), totalPages };
    } catch (error) {
        console.error('Error in getEvents:', error);
        throw error;
    }
}

export async function getEventById(id: string): Promise<EventWithSubEvents | null> {
    try {
        await connectToDatabase();

        // First, find the event by ID
        const event = await Event.findById(id)
            .populate('organizer', 'username photo')
            .populate('category', 'name')
            .populate('tags', 'name')
            .lean();

        if (!event) {
            return null;
        }

        // If this is a sub-event, ensure it has all necessary fields from the parent
        if (event.parentEvent) {
            const parentEventId = typeof event.parentEvent === 'string' 
                ? event.parentEvent 
                : (event.parentEvent as any)._id;
                
            const parentEvent = await Event.findById(parentEventId)
                .select('photo isFree price totalCapacity ticketsLeft soldOut')
                .lean();
            
            if (parentEvent) {
                // Always inherit photo from parent for sub-events to ensure consistency
                if (parentEvent.photo) {
                    event.photo = parentEvent.photo;
                }
                
                // For sub-events, always use parent's ticket pool
                // Only mark as sold out if parent is sold out or tickets are actually 0
                if (parentEvent.ticketsLeft !== undefined && parentEvent.ticketsLeft !== null) {
                    event.ticketsLeft = parentEvent.ticketsLeft;
                    event.soldOut = parentEvent.soldOut || parentEvent.ticketsLeft <= 0;
                } else {
                    event.ticketsLeft = event.ticketsLeft ?? 0;
                    event.soldOut = event.soldOut || event.ticketsLeft <= 0;
                }
                
                // Inherit price information
                if (parentEvent.price !== undefined) {
                    event.price = parentEvent.price;
                    event.isFree = parentEvent.isFree;
                }
            }
        }

        // If this is a main event with sub-events, fetch and process them
        if (!event.parentEvent) {
            const subEvents = await Event.find({ parentEvent: event._id })
                .populate('organizer', 'username photo')
                .populate('category', 'name')
                .populate('tags', 'name')
                .lean<IEvent[]>();

            // Process each sub-event to ensure they have all necessary fields
            const processedSubEvents = await Promise.all(subEvents.map(async (subEvent: any) => {
                // Always inherit photo from parent for consistency
                if (event.photo) {
                    subEvent.photo = event.photo;
                }
                
                // Use parent's ticket pool for sub-events
                if (event.ticketsLeft !== undefined && event.ticketsLeft !== null) {
                    subEvent.ticketsLeft = event.ticketsLeft;
                    subEvent.soldOut = event.soldOut || event.ticketsLeft <= 0;
                } else {
                    subEvent.ticketsLeft = subEvent.ticketsLeft ?? 0;
                    subEvent.soldOut = subEvent.soldOut || subEvent.ticketsLeft <= 0;
                }
                
                // Always inherit price information from parent
                if (event.price !== undefined) {
                    subEvent.price = event.price;
                    subEvent.isFree = event.isFree;
                }
                
                return subEvent;
            }));

            // Add processed sub-events to the main event
            (event as EventWithSubEvents).subEvents = processedSubEvents;
        }

        return event as EventWithSubEvents;
    } catch (error) {
        console.error('Error getting event by ID:', error);
        throw error;
    }
}

export async function getEventsByCategory(category: string) {
    try {
        await connectToDatabase();

        const events = await Event.find({ category: category })
            .populate("category", "name")
            .populate("organizer", "firstName lastName email")
            .populate("tags", "name");

        return JSON.parse(JSON.stringify(events));
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function getRelatedEvents(eventId: string): Promise<IEvent[]> {
    try {
        await connectToDatabase();

        const event = await Event.findById(eventId);

        if (!event) {
            throw new Error("Event not found");
        }

        const relatedEvents = await Event.find({
            $and: [
                { _id: { $ne: eventId } },
                { category: event.category },
                { parentEvent: { $exists: false } },
            ],
        } as FilterQuery<IEvent>)
            .populate("category", "name")
            .populate("organizer", "firstName lastName email")
            .populate("tags", "name")
            .limit(3)
            .lean<IEvent[]>();

        return JSON.parse(JSON.stringify(relatedEvents));
    } catch (error) {
        console.error('Error in getRelatedEvents:', error);
        throw error;
    }
}

export async function getEventsByUserId(userId: string) {
    try {
        await connectToDatabase();

        const events = await Event.find({ organizer: userId })
            .populate("category", "name")
            .populate("organizer", "firstName lastName email")
            .populate("tags", "name");

        return JSON.parse(JSON.stringify(events));
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function deleteEventById(eventId: string) {
    try {
        await connectToDatabase();

        const event = await Event.findByIdAndDelete(eventId);

        await Tag.updateMany({ events: eventId }, { $pull: { events: eventId } });

        await User.updateMany({ likedEvents: eventId }, { $pull: { likedEvents: eventId } });

        // add refund logic here

        await Order.deleteMany({ event: eventId });

        revalidatePath("/");
        revalidatePath("/profile");
        revalidatePath("/tickets");
        revalidatePath("/likes");

        return JSON.parse(JSON.stringify(event));
    } catch (error) {
        console.log(error);
        throw error;
    }
}