"use server"

import { redirect } from "next/navigation";
import Stripe from "stripe";
import Order from "../models/order.model";
import User from "../models/user.model";
import Event from "../models/event.model";
import { connectToDatabase } from "../dbconnection";
import { revalidatePath } from "next/cache";
import Category from "../models/category.model";

export interface OrderProps {
    totalTickets: number;
    totalAmount: number;
    user: any;
    event: any;
}

export async function checkoutOrder(order: OrderProps) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        unit_amount: order.totalAmount * 100,
                        product_data: {
                            name: order.event.title,
                        }
                    },
                    quantity: order.totalTickets,
                },
            ],
            metadata: {
                totalTickets: order.totalTickets,
                userId: order.user._id,
                eventId: order.event._id,
            },
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/tickets`,
            cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/event/${order.event._id}`,
        });

        redirect(session.url!)
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export interface createOrderParams {
    stripeId: string;
    totalTickets: number;
    totalAmount: number,
    user: string;
    event: string;
}


export async function createOrder(order: createOrderParams) {
    try {
        connectToDatabase();

        const newOrder = await Order.create(order);

        const user = await User.findById(order.user);

        const event = await Event.findById(order.event);

        if (event) {
            event.attendees.push(user?._id);

            if (event.totalCapacity !== -Infinity) {
                event.soldOut = event.ticketsLeft <= 0 ? true : false;
            }

            if (event.totalCapacity !== -Infinity) {
                event.ticketsLeft = event.ticketsLeft - order.totalTickets;
            }

            await event.save();
        }

        await newOrder.save();

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