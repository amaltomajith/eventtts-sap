// app/profile/page.tsx

import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import Collection from "@/components/shared/Collection";
import { getEventsByUserId } from "@/lib/actions/event.action";
import { getOrdersByUserId } from "@/lib/actions/order.action";
import IOrder from "@/lib/models/order.model";
import { getUserByClerkId } from "@/lib/actions/user.action";

const ProfilePage = async () => {
  const { userId: clerkId } = auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const mongoUser = await getUserByClerkId(clerkId);

  const organizedEventsPromise = getEventsByUserId({ userId: mongoUser._id });
  const ordersPromise = getOrdersByUserId({ userId: mongoUser._id });

  const [organizedEvents, orders] = await Promise.all([
    organizedEventsPromise,
    ordersPromise,
  ]);

  const myTickets = orders?.data.map((order: IOrder) => order.event) || [];
  const myOrganizedEvents = organizedEvents?.data || [];

  return (
    <>
      {/* My Tickets Section */}
      <section className="bg-primary-50 ...">
        {/* ... */}
      </section>

      <div className="wrapper my-8">
        <Collection
          data={myTickets}
          emptyTitle="No event tickets purchased yet"
          emptyStateSubtext="No worries - plenty of exciting events to explore!"
          collectionType="My_Tickets"
          limit={3}
          page={1}
          totalPages={orders?.totalPages}
          // ✅ PASS THE ID HERE
          currentUserId={clerkId} 
        />
      </div>

      {/* Events Organized Section */}
      <section className="bg-primary-50 ...">
        {/* ... */}
      </section>

      <div className="wrapper my-8">
        <Collection
          data={myOrganizedEvents}
          emptyTitle="No events have been created yet"
          emptyStateSubtext="Go create some now!"
          collectionType="Events_Organized"
          limit={6}
          page={1}
          totalPages={organizedEvents?.totalPages}
          // ✅ AND PASS THE ID HERE
          currentUserId={clerkId}
        />
      </div>
    </>
  );
};

export default ProfilePage;