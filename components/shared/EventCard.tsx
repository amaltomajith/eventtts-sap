import Image from "next/image";
import React from "react";
import { Badge } from "../ui/badge";
import { dateConverter, timeFormatConverter } from "@/lib/utils";
import Link from "next/link";
import LikeCartButton from "./LikeCartButton";
import { auth } from "@clerk/nextjs";
import { getUserByClerkId } from "@/lib/actions/user.action";

interface Props {
  event: any;
  page?: string;
}

const EventCard = async ({ event, page }: Props) => {
  const { userId } = auth();

  let user = null;

  let likedEvent = false;

  if (userId) {
    user = await getUserByClerkId(userId);
    likedEvent = await user.likedEvents.includes(event._id);
  }

  return (
    <div className="border h-96 w-96 rounded-md flex flex-col hover:scale-95 transition-all shadow-md relative">
      <Link href={`/event/${event._id}`} className="w-full h-1/2 relative">
        {event.photo ? (
          <Image
            src={event.photo}
            alt={event.title || 'Event image'}
            width={1920}
            height={1280}
            className="w-full h-full rounded-t-md object-cover hover:opacity-80 transition-all"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-t-md">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
        {event.soldOut && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
            Sold Out
          </div>
        )}
      </Link>

      {!event.parentEvent && <LikeCartButton event={event} user={user} likedEvent={likedEvent} />}

      <Link
        href={`/event/${event._id}`}
        className="p-2 flex flex-col items-start gap-1 flex-1 font-medium"
      >
        <div className="w-full flex flex-wrap gap-2 justify-start items-center">
          <Badge variant="default">
            {event.isFree ? "Free" : `₹ ${event.price}`}
          </Badge>
                    <Badge variant="secondary">{event.category.name}</Badge>
          {event.subEvents && event.subEvents.length > 0 && (
            <Badge variant="outline">Main Event</Badge>
          )}
          <Badge variant="secondary">
            {event.landmark ? event.landmark : "Online"}
          </Badge>
        </div>
        <div className="flex flex-col justify-around flex-1">
          <div className="flex flex-wrap gap-1">
            <p className="text-sm">
              {new Date(event.endDate) > new Date(event.startDate)
                ? `${dateConverter(event.startDate)} - ${dateConverter(
                    event.endDate
                  )} `
                : `${dateConverter(event.startDate)}`}
            </p>
            &nbsp;
            <p className="text-sm">
              {timeFormatConverter(event.startTime)} -{" "}
              {timeFormatConverter(event.endTime)}
            </p>
          </div>
          <h3 className="text-xl font-semibold line-clamp-1">{event.title}</h3>
          <p className="font-normal text-xs line-clamp-2">
            {event.description}
          </p>
        </div>
      </Link>
      <div className="flex justify-between items-center p-2 border-t">
        <Badge
          variant={"secondary"}
          className="w-fit"
        >
          {event.organizer ? `${event.organizer.firstName} ${event.organizer.lastName}` : 'Organizer'}
        </Badge>
        {event.ticketsLeft !== undefined && event.ticketsLeft > 0 && (
          <span className="text-xs text-gray-500">
            {event.ticketsLeft} {event.ticketsLeft === 1 ? 'ticket' : 'tickets'} left
          </span>
        )}
      </div>
    </div>
  );
};

export default EventCard;
