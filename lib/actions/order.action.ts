"use server"

import { redirect } from "next/navigation";
import Stripe from "stripe";
import Order from "../models/order.model";
import User from "../models/user.model";
import Event from "../models/event.model";
import { connectToDatabase } from "../dbconnection";
import { revalidatePath } from "next/cache";
import Category from "../models/category.model";

interface EventReference {
    _id: string;
    title: string;
    isFree: boolean;
    price: number;
    startDate: Date;
    endDate: Date;
    photo: string;
    totalCapacity: number;
    ticketsLeft: number;
    subEventId?: string; // For sub-events
}

export interface OrderProps {
    totalTickets: number;
    totalAmount: number;
    user: any;
    event: string | EventReference; // Can be either ID or full event object
}

export async function checkoutOrder(order: OrderProps) {
    // Ensure we have the event ID and check if it's free
    const eventId = typeof order.event === 'string' ? order.event : order.event._id;
    const isFree = typeof order.event === 'string' ? false : order.event.isFree;
    const eventTitle = typeof order.event === 'string' ? 'Event' : order.event.title;
    
    // For free events, directly create the order without Stripe
    if (order.totalAmount === 0 || isFree) {
        try {
            const newOrder = await createOrder({
                stripeId: 'free-event-' + Date.now(),
                totalTickets: order.totalTickets,
                totalAmount: 0,
                user: order.user, // order.user is already the user ID string
                event: {
                    _id: eventId,
                    subEventId: (typeof order.event !== 'string' && 'subEventId' in order.event) ? order.event.subEventId : undefined
                }
            });
            
            // Return a success URL that will be handled by the frontend
            return { url: `${process.env.NEXT_PUBLIC_SERVER_URL}/tickets?success=true` };
        } catch (error) {
            console.error('Error creating free order:', error);
            throw error;
        }
    }

    // For paid events, use Stripe checkout
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
        // Prepare line items for Stripe
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{
            price_data: {
                currency: 'inr',
                unit_amount: Math.round(order.totalAmount * 100), // Convert to smallest currency unit (paise)
                product_data: {
                    name: eventTitle,
                    description: `Tickets for ${eventTitle}`,
                },
            },
            quantity: order.totalTickets,
        }];

        // Prepare metadata
        const metadata: Record<string, string> = {
            totalTickets: order.totalTickets.toString(),
            userId: order.user.toString(), // order.user is already the user ID string
            eventId: eventId.toString(),
        };

        // Add subEventId to metadata if it exists
        if (typeof order.event !== 'string' && 'subEventId' in order.event && order.event.subEventId) {
            metadata.subEventId = order.event.subEventId;
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/tickets?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/event/${eventId}?canceled=true`,
            metadata,
        });

        return { url: session.url };
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        throw error;
    }
}

interface OrderEvent {
    _id: string;
    subEventId?: string;
}

export interface createOrderParams {
    stripeId: string;
    totalTickets: number;
    totalAmount: number;
    user: string;
    event: string | OrderEvent;
    subEvent?: string;
}


export async function createOrder(order: createOrderParams) {
    try {
        await connectToDatabase();
        
        // Extract event ID and sub-event ID based on the type of order.event
        const eventId = typeof order.event === 'string' ? order.event : order.event._id;
        const subEventId = (typeof order.event !== 'string' && 'subEventId' in order.event) 
            ? order.event.subEventId 
            : undefined;
        
        // Find the target event (could be main event or sub-event)
        let event = await Event.findById(eventId);
        
        if (!event) {
            throw new Error('Event not found');
        }
        
        // If we have a subEventId, we need to find the actual sub-event
        if (subEventId) {
            const subEvent = await Event.findById(subEventId);
            if (!subEvent) {
                throw new Error('Sub-event not found');
            }
            if (!subEvent.parentEvent || subEvent.parentEvent.toString() !== eventId) {
                throw new Error('Invalid sub-event reference: Sub-event does not belong to this main event');
            }
            // Use the sub-event for the order
            event = subEvent;
        }
        
        // If this is a sub-event, find the parent event for ticket management
        let parentEvent = null;
        if (event.parentEvent) {
            parentEvent = await Event.findById(event.parentEvent);
            if (!parentEvent) {
                throw new Error('Parent event not found');
            }
        } else if (subEventId) {
            // If we have a subEventId but the event doesn't have a parent, it's invalid
            throw new Error('Invalid sub-event reference');
        }

        // Determine which event to use for ticket management
        const targetEvent = parentEvent || event;

        // Check ticket availability from the target event
        const availableTickets = targetEvent.ticketsLeft !== undefined 
            ? targetEvent.ticketsLeft 
            : (targetEvent.totalCapacity > 0 ? targetEvent.totalCapacity : 0);

        if (availableTickets < order.totalTickets) {
            throw new Error(`Only ${availableTickets} ticket${availableTickets !== 1 ? 's' : ''} available`);
        }

        // Create the order with all necessary fields
        const orderData = {
            stripeId: order.stripeId,
            totalTickets: order.totalTickets,
            totalAmount: order.totalAmount,
            event: event._id,
            user: order.user,
            status: 'completed' as const,
            ...(subEventId && { subEvent: subEventId })
        };

        // Create the order
        const newOrder = await Order.create(orderData);

        // Update ticket count for the target event
        if (targetEvent.ticketsLeft !== undefined) {
            targetEvent.ticketsLeft = Math.max(0, availableTickets - order.totalTickets);
            targetEvent.soldOut = targetEvent.ticketsLeft <= 0;
            await targetEvent.save();
        }

        // If we have a sub-event, update its ticket count as well
        if (subEventId && event._id.toString() !== targetEvent._id.toString()) {
            if (event.ticketsLeft !== undefined) {
                event.ticketsLeft = Math.max(0, (event.ticketsLeft || 0) - order.totalTickets);
                event.soldOut = event.ticketsLeft <= 0;
                await event.save();
            }
        }

        await event.save();
        revalidatePath("/tickets");

        return JSON.parse(JSON.stringify(newOrder));
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function getOrdersByUserId({ userId, page = 1, limit = 3 }: { userId: string, page?: number, limit?: number }) {
    try {
        await connectToDatabase();

        const conditions = { user: userId };
        const skipAmount = (page - 1) * limit;

        const orders = await Order.find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(limit)
            .populate({
                path: "event",
                model: Event,
                populate: [
                    { path: "organizer", model: User },
                    { path: "category", model: Category },
                ]
            });
        
        const ordersCount = await Order.countDocuments(conditions);

        return { data: JSON.parse(JSON.stringify(orders)), totalPages: Math.ceil(ordersCount / limit) };
    } catch (error) {
        console.log(error);
        throw error;
    }
}
// lib/actions/order.action.ts

// ... (keep all your existing code in this file)

export async function getEventStatistics(eventId: string) {
  try {
    await connectToDatabase();

    const orders = await Order.find({ event: eventId });

    if (!orders) {
      return { totalTicketsSold: 0, totalRevenue: 0 };
    }

    const totalTicketsSold = orders.reduce((total, order) => total + order.totalTickets, 0);
    const totalRevenue = orders.reduce((total, order) => total + order.totalAmount, 0);

    return { totalTicketsSold, totalRevenue };
  } catch (error) {
    console.log(error);
    throw error;
  }
}