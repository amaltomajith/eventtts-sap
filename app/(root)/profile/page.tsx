import Link from "next/link";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import EventCards from "@/components/shared/EventCards";
import { getEventsByUserId } from "@/lib/actions/event.action";
import { getOrdersByUserId } from "@/lib/actions/order.action";
import IOrder from "@/lib/models/order.model"; 
import { getUserByClerkId } from "@/lib/actions/user.action";

// ✅ This is the definitive fix for the headers/searchParams error
export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  searchParams: { page?: string };
}

const ProfilePage = async ({ searchParams }: ProfilePageProps) => {
  const { userId: clerkId } = auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const mongoUser = await getUserByClerkId(clerkId);
  const organizedEventsPage = Number(searchParams.page) || 1;

  const organizedEventsPromise = getEventsByUserId({ userId: mongoUser._id, page: organizedEventsPage });
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
      <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
        <div className="wrapper flex items-center justify-center sm:justify-between">
          <h3 className="h3-bold text-center sm:text-left">My Tickets</h3>
          <Button asChild size="lg" className="button hidden sm:flex">
            <Link href="/#events">Explore More Events</Link>
          </Button>
        </div>
      </section>

      <div className="wrapper my-8">
        <EventCards
          events={myTickets}
          currentUserId={clerkId}
          emptyTitle="No event tickets purchased yet"
          emptyStateSubtext="No worries - plenty of exciting events to explore!"
        />
      </div>

      {/* Events Organized Section */}
      <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
        <div className="wrapper flex items-center justify-center sm:justify-between">
          <h3 className="h3-bold text-center sm:text-left">Events Organized</h3>
          <Button asChild size="lg" className="button hidden sm:flex">
            <Link href="/create-event">Create New Event</Link>
          </Button>
        </div>
      </section>

      <div className="wrapper my-8">
        <EventCards
          events={myOrganizedEvents}
          currentUserId={clerkId}
          emptyTitle="No events have been created yet"
          emptyStateSubtext="Go create some now!"
        />
      </div>
    </>
  );
};

export default ProfilePage;