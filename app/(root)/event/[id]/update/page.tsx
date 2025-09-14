// app/event/[id]/update/page.tsx
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import EventForm from "@/components/shared/EventForm";
import { getEventById } from "@/lib/actions/event.action";
import { getUserByClerkId } from "@/lib/actions/user.action";

interface UpdateEventPageProps {
  params: {
    id: string;
  };
}

const UpdateEventPage = async ({ params: { id } }: UpdateEventPageProps) => {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get the current user
  const user = await getUserByClerkId(userId);
  
  // Get the event data
  const event = await getEventById(id);

  // Check if the current user is the organizer of this event
  if (!event || event.organizer._id !== user._id) {
    redirect("/");
  }

  return (
    <div className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
      <div className="wrapper">
        <h2 className="h2-bold text-center sm:text-left">Update Event</h2>
        
        <div className="my-8">
          <EventForm 
            userId={user._id} 
            type="edit" 
            event={event} 
            eventId={event._id} 
          />
        </div>
      </div>
    </div>
  );
};

export default UpdateEventPage;