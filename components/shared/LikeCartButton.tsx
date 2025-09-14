"use client";

import React, { useEffect, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { MdOutlineDoNotDisturbOn, MdOutlineShoppingCart } from "react-icons/md";
import { useToast } from "../ui/use-toast";
import { likeEvent } from "@/lib/actions/user.action";
import { getEventById } from "@/lib/actions/event.action";
import { Button } from "../ui/button";
import { loadStripe } from "@stripe/stripe-js";
import { checkoutOrder } from "@/lib/actions/order.action";
import { IEvent } from "@/lib/models/event.model";
import type { Types } from 'mongoose';

// Define a type for the event with all required properties
type EventWithSubEvents = IEvent & {
  subEvents?: IEvent[];
  parentEvent?: string | IEvent | Types.ObjectId | null;
  _id: string | Types.ObjectId;
  startDate: Date | string;
  endDate?: Date | string;
  photo: string;
  title: string;
  ticketsLeft: number;
  totalCapacity?: number;
  soldOut: boolean;
  isFree: boolean;
  price: number;
  organizer?: {
    _id: string | Types.ObjectId;
    firstName?: string;
    lastName?: string;
    username?: string;
    photo?: string;
  };
  category?: {
    _id: string | Types.ObjectId;
    name: string;
  };
  tags?: Array<{
    _id: string | Types.ObjectId;
    name: string;
  }>;
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";

loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type LikeCartButtonProps = {
  event: EventWithSubEvents;
  user: {
    _id: string | Types.ObjectId;
    likedEvents: Array<string | Types.ObjectId>;
    [key: string]: any;
  } | null;
  likedEvent: boolean;
  option?: string;
}

const LikeCartButton = ({ event, user, likedEvent, option }: LikeCartButtonProps) => {
  const { toast } = useToast();

  const isPastEvent = new Date(event.startDate) < new Date();
  
  // Calculate ticket availability - handle both main events and sub-events
  const availableTickets = event.ticketsLeft !== undefined ? event.ticketsLeft : 
                         (event.totalCapacity > 0 ? event.totalCapacity : 1);
  
  // Only mark as sold out if explicitly set or no tickets left
  const isSoldOut = event.soldOut || availableTickets <= 0;
  
  // Disable cart if past event or sold out
  const disableCart = isPastEvent || isSoldOut;

  const [totalTickets, setTotalTickets] = useState(1);
  
  // Calculate max tickets that can be booked
  const maxTickets = Math.max(1, availableTickets || 1);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      console.log("Order placed! You will receive an email confirmation.");
    }

    if (query.get("canceled")) {
      console.log(
        "Order canceled -- continue to shop around and checkout when you’re ready."
      );
    }
  }, []);

  const handleCheckout = async () => {
    try {
      if (!user) {
        toast({
          variant: "destructive",
          title: "You must be logged in to register for an event.",
        });
        return;
      }

      // Get the latest event data to ensure we have current ticket availability
      const currentEvent = await getEventById(event._id);
      
      if (!currentEvent) {
        throw new Error('Event not found');
      }

      // For sub-events, we'll use the parent event's ticket pool
      let parentEventId: string | null = null;
      let parentEvent = null;
      
      if (currentEvent.parentEvent) {
        if (typeof currentEvent.parentEvent === 'string') {
          parentEventId = currentEvent.parentEvent;
        } else if (currentEvent.parentEvent && 
                 typeof currentEvent.parentEvent === 'object' && 
                 '_id' in currentEvent.parentEvent) {
          const parentId = currentEvent.parentEvent._id;
          parentEventId = typeof parentId === 'string' ? parentId : parentId.toString();
        }
        
        // If we have a parent event ID, fetch the parent event
        if (parentEventId) {
          parentEvent = await getEventById(parentEventId);
        }
      }
      
      // Determine which event to use for ticket management
      const targetEvent = parentEvent || currentEvent;
      
      if (!targetEvent) {
        throw new Error('Event data not available');
      }

      // Ensure we have valid IDs as strings
      const targetEventId = targetEvent._id?.toString() || '';
      const currentEventId = currentEvent._id?.toString() || '';
      const isSubEvent = !!parentEvent;

      // Check ticket availability from the target event (parent for sub-events)
      const availableTickets = typeof targetEvent.ticketsLeft === 'number' 
        ? targetEvent.ticketsLeft 
        : (targetEvent.totalCapacity || 0);
      
      if (availableTickets <= 0) {
        throw new Error('No tickets available');
      }

      // For free events, set totalAmount to 0
      const amount = targetEvent.isFree ? 0 : ((targetEvent.price || 0) * totalTickets);
      
      // Prepare event data for the order with proper typing
      const orderEvent: any = {
        _id: targetEventId,
        title: currentEvent.title || 'Event',
        isFree: targetEvent.isFree || false,
        price: targetEvent.price || 0,
        startDate: currentEvent.startDate,
        endDate: currentEvent.endDate,
        photo: currentEvent.photo || targetEvent.photo || '',
        totalCapacity: targetEvent.totalCapacity || 0,
        ticketsLeft: availableTickets,
      };
      
      // Add subEventId if this is a sub-event (subEventId should be the sub-event ID, not parent)
      if (isSubEvent) {
        orderEvent.subEventId = currentEventId;
        orderEvent.subEventTitle = currentEvent.title;
      }
      
      // Ensure user ID is properly formatted
      const userId = typeof user._id === 'string' ? user._id : user._id.toString();
      
      const order = {
        totalTickets: Math.min(totalTickets, availableTickets),
        totalAmount: amount,
        user: userId,
        event: orderEvent,
      };

      const { url } = await checkoutOrder(order);
      
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong.",
        description: error.message,
      });
    }
  };

  const handleLike = async () => {
    try {
      if (!user) {
        toast({
          variant: "destructive",
          title: "You must be logged in to like an event.",
        });
        return;
      }

      const eventId = typeof event._id === 'string' ? event._id : event._id.toString();
      const userId = typeof user._id === 'string' ? user._id : user._id.toString();
      
      const isLiked = user.likedEvents.some((id: string | Types.ObjectId) => {
        const idStr = typeof id === 'string' ? id : id.toString();
        return idStr === eventId;
      });

      await likeEvent(eventId, userId);

      if (isLiked) {
        toast({
          title: "Event removed from Liked Events.",
        });
      } else {
        toast({
          title: "Event added to Liked Events.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong.",
        description: error.message,
      });
    }
  };

  return (
    <>
      {option === "eventPage" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleLike()}
              variant={"secondary"}
              className="flex gap-1 rounded-full hover:scale-105 transition-all"
            >
              {!likedEvent && (
                <span>
                  <FaRegHeart className="h-5 w-5 text-primary" />
                </span>
              )}
              {likedEvent && (
                <span>
                  <FaHeart className="h-5 w-5 text-primary" />
                </span>
              )}
              Like
            </Button>
            {!disableCart && (
              <Dialog>
                <DialogTrigger>
                  <Button
                    // onClick={() => handleCheckout()}
                    variant={"secondary"}
                    className="flex gap-1 rounded-full hover:scale-105 transition-all"
                  >
                    <MdOutlineShoppingCart className="h-5 w-5 text-primary" />
                    Book Now
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Number of Tickets</DialogTitle>
                    <DialogDescription>
                      <div className="flex max-sm:flex-col justify-center items-center gap-5 mt-1">
                        <span className="text-primary text-2xl font-bold">
                          ₹{event.price * totalTickets}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={maxTickets}
                          value={totalTickets}
                          onChange={(e) => {
                            const value = Math.min(Math.max(1, +e.target.value), maxTickets);
                            setTotalTickets(value);
                          }}
                        />
                        <Button onClick={() => handleCheckout()}>Book</Button>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
            {disableCart && (
              <Button
                variant={"destructive"}
                disabled
                className="flex gap-1 rounded-full hover:scale-105 transition-all"
              >
                <MdOutlineDoNotDisturbOn className="h-5 w-5 text-primary" />
                Sold Out
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="absolute bottom-1/2 right-1 flex justify-center items-center">
          <div className="border bg-secondary rounded-full m-1 h-7 w-7 flex justify-center items-center hover:scale-125">
            {!likedEvent && (
              <span onClick={() => handleLike()}>
                <FaRegHeart className="h-full w-full p-1 text-primary" />
              </span>
            )}
            {likedEvent && (
              <span onClick={() => handleLike()}>
                <FaHeart className="h-full w-full p-1 text-primary" />
              </span>
            )}
          </div>
          {!disableCart && (
            // <div className="border bg-secondary rounded-full m-1 h-7 w-7 flex justify-center items-center hover:scale-125">
            //   <span onClick={() => handleCheckout()}>
            //     <MdOutlineShoppingCart className="h-full w-full p-1 text-primary" />
            //   </span>
            // </div>
            <Dialog>
              <DialogTrigger>
                <div className="border bg-secondary rounded-full m-1 h-7 w-7 flex justify-center items-center hover:scale-125">
                  <span>
                    <MdOutlineShoppingCart className="h-full w-full p-1 text-primary" />
                  </span>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Number of Tickets</DialogTitle>
                  <DialogDescription>
                    <div className="flex max-sm:flex-col justify-center items-center gap-5 mt-1">
                      <span className="text-primary text-2xl font-bold">
                        ₹{event.price * totalTickets}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={maxTickets}
                        value={totalTickets}
                        onChange={(e) => setTotalTickets(+e.target.value)}
                      />
                      <Button onClick={() => handleCheckout()}>Book</Button>
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </>
  );
};

export default LikeCartButton;
