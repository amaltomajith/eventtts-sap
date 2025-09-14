"use server";

import { revalidatePath } from "next/cache";
import { FilterQuery } from "mongoose";
import { connectToDatabase } from "../dbconnection";
import Category from "../models/category.model";
import Event, { IEvent } from "../models/event.model";
import Tag from "../models/tag.model";
import User from "../models/user.model";
import Order from "../models/order.model";
import { getEventStatistics } from "./order.action";

// --- HELPER FUNCTION FOR CATEGORY AND TAGS ---
const getCategoryByName = async (name: string) => {
  return Category.findOneAndUpdate(
    { name: { $regex: name, $options: "i" } },
    { $setOnInsert: { name } },
    { new: true, upsert: true }
  );
};

// --- CORE EVENT ACTIONS ---

export async function createEvent(eventData: any) {
  try {
    await connectToDatabase();

    const category = await getCategoryByName(eventData.category);

    const tagIds = await Promise.all(
      eventData.tags.map((tag: string) =>
        Tag.findOneAndUpdate(
          { name: { $regex: tag, $options: "i" } },
          { $setOnInsert: { name: tag } },
          { new: true, upsert: true }
        ).then((doc) => doc._id)
      )
    );

    const newEvent = await Event.create({
      ...eventData,
      category: category._id,
      tags: tagIds,
      ticketsLeft: eventData.totalCapacity,
    });

    // Add the new event to the tags it belongs to
    await Tag.updateMany(
      { _id: { $in: tagIds } },
      { $push: { events: newEvent._id } }
    );

    revalidatePath("/");

    return JSON.parse(JSON.stringify(newEvent));
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create event");
  }
}

export async function getEvents(
  searchQuery: string,
  categoryName: string,
  page = 1,
  pageSize = 12
) {
  try {
    await connectToDatabase();
    
    // Sanitize page number to prevent errors
    const pageNumber = Math.max(1, page);
    const skip = (pageNumber - 1) * pageSize;

    const query: FilterQuery<IEvent> = {};

    if (searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") } },
        { description: { $regex: new RegExp(searchQuery, "i") } },
      ];
    }

    if (categoryName) {
      const category = await Category.findOne({ name: { $regex: new RegExp(categoryName, "i") } });
      if (category) {
        query.category = category._id;
      } else {
        // If category doesn't exist, return no events
        return { events: [], totalPages: 0 };
      }
    }

    const events = await Event.find(query)
      .populate("category", "name")
      .populate("organizer", "firstName lastName email")
      .populate("tags", "name")
      .sort({ createdAt: "desc" })
      .skip(skip)
      .limit(pageSize);

    const total = await Event.countDocuments(query);
    const totalPages = Math.ceil(total / pageSize);

    return { events: JSON.parse(JSON.stringify(events)), totalPages };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch events");
  }
}

export async function getEventById(id: string) {
  try {
    await connectToDatabase();

    const event = await Event.findById(id)
      .populate("category", "name")
      .populate("organizer", "_id firstName lastName email")
      .populate("tags", "name");

    if (!event) throw new Error("Event not found");

    return JSON.parse(JSON.stringify(event));
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch event by ID");
  }
}

export async function updateEvent({ userId, event, path }: { userId: string, event: any, path: string }) {
  try {
    await connectToDatabase();

    const eventToUpdate = await Event.findById(event._id);
    if (!eventToUpdate || eventToUpdate.organizer.toHexString() !== userId) {
      throw new Error("Unauthorized or event not found");
    }

    const category = await getCategoryByName(event.category);
    const tagIds = await Promise.all(
        event.tags.map((tag: string) =>
          Tag.findOneAndUpdate(
            { name: { $regex: tag, $options: "i" } },
            { $setOnInsert: { name: tag } },
            { new: true, upsert: true }
          ).then(doc => doc._id)
        )
    );
    
    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      { ...event, category: category._id, tags: tagIds },
      { new: true }
    );
    revalidatePath(path);

    return JSON.parse(JSON.stringify(updatedEvent));
  } catch (error) {
    console.error(error);
    throw new Error("Failed to update event");
  }
}

export async function deleteEventById(eventId: string) {
  try {
    await connectToDatabase();

    await Event.findByIdAndDelete(eventId);

    // Clean up references in other collections
    await Tag.updateMany({ events: eventId }, { $pull: { events: eventId } });
    await User.updateMany({ likedEvents: eventId }, { $pull: { likedEvents: eventId } });
    await Order.deleteMany({ event: eventId });

    revalidatePath("/");
    revalidatePath("/profile");
  } catch (error) {
    console.error(error);
    throw new Error("Failed to delete event");
  }
}

export async function getRelatedEvents(id: string) {
  try {
    await connectToDatabase();

    const event = await Event.findById(id);
    if (!event) throw new Error("Event not found");

    const relatedEvents = await Event.find({
      _id: { $ne: event._id }, // Correctly exclude the event itself
      $or: [
        { category: event.category }, 
        { tags: { $in: event.tags } }
      ],
    })
      .limit(3)
      .populate("category", "name")
      .populate("organizer", "firstName lastName email")
      .populate("tags", "name");

    return JSON.parse(JSON.stringify(relatedEvents));
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get related events");
  }
}

export async function getEventsByUserId({ userId, page = 1, limit = 6 }: { userId: string, page?: number, limit?: number }) {
  try {
    await connectToDatabase();

    const conditions = { organizer: userId };
    const skipAmount = (Math.max(1, page) - 1) * limit;

    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(limit)
      .populate("category", "name")
      // ✅ FIX: Use a more explicit populate object to ensure clerkId is fetched
      .populate({
        path: 'organizer',
        model: 'User',
        select: '_id firstName lastName clerkId' 
      })
      .populate("tags", "name");

    const events = await eventsQuery;
    const eventsCount = await Event.countDocuments(conditions);

    return { data: JSON.parse(JSON.stringify(events)), totalPages: Math.ceil(eventsCount / limit) };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function generateSalesReport(eventId: string) {
  try {
    // Reusing the function from order actions is a great idea!
    const stats = await getEventStatistics(eventId);
    return stats;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to generate sales report");
  }
}