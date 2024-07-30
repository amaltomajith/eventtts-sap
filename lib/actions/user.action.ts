"use server";

import User from "../models/user.model";
import { connectToDatabase } from "../dbconnection";
import Event from "../models/event.model";
import Order from "../models/order.model";
import { revalidatePath } from "next/cache";

export interface CreateUserParams {
	clerkId: string;
	email: string;
	username: string;
	firstName: string;
	lastName?: string;
	photo?: string;
}

export async function createUser(userData: CreateUserParams) {
	try {
		await connectToDatabase();
		const user = await User.create(userData);
		return JSON.parse(JSON.stringify(user));
	} catch (error) {
		console.error("Error creating user:", error);
		throw error;
	}
}

export async function getUserByClerkId(clerkId: string) {
	try {
		await connectToDatabase();
		console.log(`Fetching user with clerkId: ${clerkId}`);

		const user = await User.findOne({ clerkId: clerkId });

		if (!user) {
			console.error(`User with clerkId ${clerkId} not found`);
			throw new Error("User not found");
		}

		console.log(`User found: ${JSON.stringify(user)}`);
		return JSON.parse(JSON.stringify(user));
	} catch (error) {
		console.error(`Error fetching user by clerkId ${clerkId}:`, error);
		throw error;
	}
}

export async function getUserById(userId: string) {
	try {
		await connectToDatabase();
		const user = await User.findById(userId);
		if (!user) {
			console.error(`User with ID ${userId} not found`);
			throw new Error("User not found");
		}
		return JSON.parse(JSON.stringify(user));
	} catch (error) {
		console.error(`Error fetching user by ID ${userId}:`, error);
		throw error;
	}
}

export interface UpdateUserParams {
	clerkId: string;
	userData: {
		username?: string;
		firstName?: string;
		lastName?: string;
		photo?: string;
	};
}

export async function updateUser(params: UpdateUserParams) {
	try {
		await connectToDatabase();
		const user = await User.findOneAndUpdate(
			{ clerkId: params.clerkId },
			params.userData,
			{ new: true } // This option returns the updated document
		);
		if (!user) {
			console.error(`User with clerkId ${params.clerkId} not found`);
			throw new Error("User not found");
		}
		return JSON.parse(JSON.stringify(user));
	} catch (error) {
		console.error(
			`Error updating user with clerkId ${params.clerkId}:`,
			error
		);
		throw error;
	}
}

export async function deleteUser(clerkId: string) {
	try {
		await connectToDatabase();
		const user = await User.findOne({ clerkId: clerkId });
		if (!user) {
			console.error(`User with clerkId ${clerkId} not found`);
			throw new Error("User not found");
		}
		await Event.deleteMany({ organizer: user._id });
		await Order.deleteMany({ user: user._id });
		await User.findByIdAndDelete(user._id);
		return JSON.parse(JSON.stringify(user));
	} catch (error) {
		console.error(`Error deleting user with clerkId ${clerkId}:`, error);
		throw error;
	}
}

export async function likeEvent(eventId: string, userId: string) {
	try {
		await connectToDatabase();
		const event = await Event.findById(eventId);
		const user = await User.findById(userId);
		if (!event) {
			console.error(`Event with ID ${eventId} not found`);
			throw new Error("Event not found");
		}
		if (!user) {
			console.error(`User with ID ${userId} not found`);
			throw new Error("Please login to like an event");
		}
		const alreadyLiked = await User.findOne({
			_id: user._id,
			likedEvents: eventId,
		});
		if (!alreadyLiked) {
			await User.findByIdAndUpdate(user._id, {
				$push: { likedEvents: eventId },
			});
		} else {
			await User.findByIdAndUpdate(user._id, {
				$pull: { likedEvents: eventId },
			});
		}
		revalidatePath(`/`);
		revalidatePath(`/likes`);
		return !!alreadyLiked;
	} catch (error) {
		console.error(
			`Error liking event ${eventId} by user ${userId}:`,
			error
		);
		throw error;
	}
}

export async function getLikedEvents(userId: string) {
	try {
		await connectToDatabase();
		const user = await User.findById(userId);
		if (!user) {
			console.error(`User with ID ${userId} not found`);
			throw new Error("User not found");
		}
		const response = await User.findById(userId).populate({
			path: "likedEvents",
			populate: [
				{ path: "organizer", model: "User" },
				{ path: "category", model: "Category" },
			],
		});
		return JSON.parse(JSON.stringify(response.likedEvents));
	} catch (error) {
		console.error(`Error fetching liked events for user ${userId}:`, error);
		throw error;
	}
}
