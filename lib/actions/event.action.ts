"use server"
import { revalidatePath } from "next/cache";
import { FilterQuery } from 'mongoose';
import { connectToDatabase } from "../dbconnection";
import Category from "../models/category.model";
import Event, { IEvent } from "../models/event.model";
import Tag from "../models/tag.model";
import User from "../models/user.model";
import Order from '../models/order.model';
import { getEventStatistics } from "./order.action";


export async function createEvent(eventData: any) {
    try {
        await connectToDatabase();

        let data = eventData;

        data.ticketsLeft = data.totalCapacity;

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

        const event = await Event.create(data);

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

export async function getEvents(searchQuery: string, page = 1, pageSize = 12) {
    try {
        await connectToDatabase();
        
        const query: FilterQuery<IEvent> = {};

        if (searchQuery) {
            query.$or = [
                { title: { $regex: new RegExp(searchQuery, "i") } },
                { description: { $regex: new RegExp(searchQuery, "i") } }
            ];
        }

        await User.find();

        const skip = (page - 1) * pageSize;

        const events = await Event.find(query)
            .populate("category", "name")
            .populate("organizer", "firstName lastName email")
            .populate("tags", "name")
            .skip(skip)
            .limit(pageSize);

        const total = await Event.countDocuments(query);

        const totalPages = Math.ceil(total / pageSize);

        return { events: JSON.parse(JSON.stringify(events)), totalPages };
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function getEventById(id: string) {
    try {
        await connectToDatabase();

        const event = await Event.findById(id)
            .populate("category", "name")
            .populate("organizer", "_id firstName lastName email")
            .populate("tags", "name");

        return JSON.parse(JSON.stringify(event));
    } catch (error) {
        console.log(error);
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

export async function getRelatedEvents(id: string) {
    try {
        await connectToDatabase();

        const event = await Event.findById(id);

        const events = await Event.find({ _id: { $nin: event._id }, category: event.category, tags: { $in: event.tags } })
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
export async function getEventsByUserId({ userId, page = 1, limit = 6 }: { userId: string, page?: number, limit?: number }) {
    try {
        await connectToDatabase();

        const conditions = { organizer: userId };
        const skipAmount = (page - 1) * limit;

        const eventsQuery = Event.find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(limit)
            .populate("category", "name")
            // ✅ FIX: Make sure to populate the organizer's clerkId
            .populate("organizer", "_id firstName lastName email clerkId")
            .populate("tags", "name");

        const events = await eventsQuery;
        const eventsCount = await Event.countDocuments(conditions);

        return { data: JSON.parse(JSON.stringify(events)), totalPages: Math.ceil(eventsCount / limit) };
    } catch (error) {
        console.log(error);
        throw error;
    }
}

// --- ADD THIS NEW FUNCTION AT THE END OF THE FILE ---
export async function generateSalesReport(eventId: string) {
    try {
        // We can reuse the function from your order actions
        const stats = await getEventStatistics(eventId);
        return stats;
    } catch (error) {
        console.log(error);
        throw error;
    }
}