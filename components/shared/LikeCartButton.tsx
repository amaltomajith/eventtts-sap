"use client";

import React, { useEffect, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { MdOutlineDoNotDisturbOn, MdOutlineShoppingCart } from "react-icons/md";
import { useToast } from "../ui/use-toast";
import { likeEvent } from "@/lib/actions/user.action";
import { Button } from "../ui/button";
import { checkoutOrder } from "@/lib/actions/order.action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";

// Note: Stripe's loadStripe promise should not be called at the top level of a module.
// It's better to call it inside the component or when it's needed, but for now we'll leave it.
// import { loadStripe } from "@stripe/stripe-js";
// loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ====================================================================================
// 1. Checkout Dialog Component (Extracted Logic)
// ====================================================================================

type CheckoutDialogProps = {
  event: any;
  user: any;
  children: React.ReactNode; // The trigger button/icon will be passed as children
};

const CheckoutDialog = ({ event, user, children }: CheckoutDialogProps) => {
  const { toast } = useToast();
  const [totalTickets, setTotalTickets] = useState(1);
  const maxTickets = event.ticketsLeft;

  const handleCheckout = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "You must be logged in to book an event.",
      });
      return;
    }

    const order = {
      totalTickets: totalTickets,
      // ✅ LOGIC FIX: Correctly calculate the total amount
      totalAmount: event.price * totalTickets,
      user: user,
      event: event,
    };

    try {
      await checkoutOrder(order);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong during checkout.",
        description: error.message,
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Number of Tickets</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col items-center gap-5 mt-4">
              <span className="text-primary text-3xl font-bold">
                ₹{event.price * totalTickets}
              </span>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={maxTickets}
                  value={totalTickets}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(maxTickets, Number(e.target.value)));
                    setTotalTickets(value);
                  }}
                  className="w-24 text-center"
                />
                 <span className="text-sm text-gray-500">
                  (Max: {maxTickets})
                </span>
              </div>
              <Button onClick={handleCheckout} className="w-full">Book Now</Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

// ====================================================================================
// 2. Main LikeCartButton Component (Refactored & Simplified)
// ====================================================================================

interface LikeCartButtonProps {
  event: any;
  user: any;
  likedEvent: boolean;
  option?: string;
}

const LikeCartButton = ({ event, user, likedEvent, option }: LikeCartButtonProps) => {
  const { toast } = useToast();
  
  // ✅ STATE MANAGEMENT FIX: Use state for the liked status so the UI updates
  const [isLiked, setIsLiked] = useState(likedEvent);

  // ✅ READABILITY FIX: Simplified logic for disabling the cart
  const isEventPast = new Date(event.startDate) < new Date();
  const areTicketsAvailable = event.ticketsLeft > 0 && !event.soldOut;
  const isCartDisabled = isEventPast || !areTicketsAvailable;
  
  // This useEffect can stay as is, it handles the Stripe redirect messages
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      toast({ title: "Order placed successfully!", description: "You will receive an email confirmation." });
    }
    if (query.get("canceled")) {
      toast({ title: "Order canceled.", description: "You can continue to shop around and checkout when you’re ready." });
    }
  }, [toast]);

  const handleLike = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "You must be logged in to like an event.",
      });
      return;
    }

    try {
      await likeEvent(event._id, user._id);
      
      // ✅ STATE MANAGEMENT FIX: Toggle the local state to trigger a re-render
      setIsLiked((prev) => !prev);
      
      toast({
        title: !isLiked ? "Event added to Liked Events." : "Event removed from Liked Events.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong.",
        description: error.message,
      });
    }
  };

  if (option === "eventPage") {
    // --- Large Button Layout for the main event page ---
    return (
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleLike}
          variant="secondary"
          className="flex gap-1 rounded-full hover:scale-105 transition-all"
        >
          {isLiked ? <FaHeart className="h-5 w-5 text-primary" /> : <FaRegHeart className="h-5 w-5 text-primary" />}
          Like
        </Button>

        {!isCartDisabled ? (
          <CheckoutDialog event={event} user={user}>
            <Button variant="secondary" className="flex gap-1 rounded-full hover:scale-105 transition-all">
              <MdOutlineShoppingCart className="h-5 w-5 text-primary" />
              Book Now
            </Button>
          </CheckoutDialog>
        ) : (
          <Button variant="destructive" disabled className="flex gap-1 rounded-full">
            <MdOutlineDoNotDisturbOn className="h-5 w-5" />
            Sold Out
          </Button>
        )}
      </div>
    );
  } else {
    // --- Small Icon Layout for event cards ---
    return (
      <div className="absolute top-2 right-2 flex flex-col items-center gap-2">
        <div className="border bg-white/80 backdrop-blur-sm rounded-full p-1 h-8 w-8 flex justify-center items-center hover:scale-110 transition-transform cursor-pointer" onClick={handleLike}>
          {isLiked ? <FaHeart className="text-primary" /> : <FaRegHeart className="text-primary" />}
        </div>

        {!isCartDisabled && (
          <CheckoutDialog event={event} user={user}>
            <div className="border bg-white/80 backdrop-blur-sm rounded-full p-1 h-8 w-8 flex justify-center items-center hover:scale-110 transition-transform cursor-pointer">
              <MdOutlineShoppingCart className="text-primary" />
            </div>
          </CheckoutDialog>
        )}
      </div>
    );
  }
};

export default LikeCartButton;