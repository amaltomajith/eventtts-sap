// app/(root)/event/[id]/page.tsx

import EventCards from "@/components/shared/EventCards";
import LikeCartButton from "@/components/shared/LikeCartButton";
import NoResults from "@/components/shared/NoResults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEventById, getRelatedEvents } from "@/lib/actions/event.action";
import { getUserByClerkId } from "@/lib/actions/user.action";
import { dateConverter, timeFormatConverter } from "@/lib/utils";
import { auth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { getEventById, getRelatedEvents } from "@/lib/actions/event.action";
import { getUserByClerkId } from "@/lib/actions/user.action";
import { auth } from "@clerk/nextjs";
import { headers } from "next/headers"; // Import headers

interface Props {
    params: { id: string };
}

const Page = async ({ params }: Props) => {
    const { userId } = auth();

    let user = null;
    let likedEvent = null;

    if (userId) {
        user = await getUserByClerkId(userId);
        likedEvent = await user.likedEvents.includes(params.id);
    }

    const event = await getEventById(params.id);

    const relatedEvents = await getRelatedEvents(params.id);

    // Logic for the "Create Report" button visibility
    const eventHasEnded = new Date(event.endDate) < new Date();

    return (
        <div className="font-medium md:mx-24">
            <div className="rounded-md md:h-[500px] flex justify-center items-center">
                <Image
                    src={event.photo}
                    alt={event.title}
                    width={1920}
                    height={1800}
                    priority={true}
                    className="rounded-md w-full h-full object-contain"
                />
            </div>
            <div className="flex flex-col gap-5">
                <h2 className="text-4xl max-sm:text-2xl mt-3">{event.title}</h2>

                <div className="flex max-sm:flex-wrap justify-left max-sm:justify-betwee items-center gap-3">
                    <Badge className="text-base">
                        {event.isFree ? `Free` : `₹ ${event.price}`}
                    </Badge>
                    <Badge
                        className="text-base"
                        variant={"secondary"}
                    >
                        {event.category.name}
                    </Badge>
                    <Badge
                        className="text-base"
                        variant={"secondary"}
                    >{`By ${event.organizer?.firstName} ${event.organizer?.lastName}`}</Badge>
                </div>

                <LikeCartButton
                    event={event}
                    user={user}
                    likedEvent={likedEvent}
                    option="eventPage"
                />

                <div className="flex flex-wrap gap-3">
                    <div>
                        {new Date(event.endDate) > new Date(event.startDate)
                            ? `${dateConverter(
                                event.startDate
                            )} - ${dateConverter(event.endDate)}`
                            : `${dateConverter(event.startDate)}`}
                    </div>
                    &nbsp;
                    <div>
                        {timeFormatConverter(event.startTime)} -{" "}
                        {timeFormatConverter(event.endTime)}
                    </div>
                </div>

                <div>
                    {event.isOnline ? "Online Event" : `${event.location}`}
                </div>

                <div>{event.description}</div>

                <Link
                    href={event.url}
                    className="text-blue-700 "
                >
                    {event.url}
                </Link>

                <div className="flex flex-wrap gap-3">
                    {event.tags?.map((tag: any) => {
                        return (
                            <Badge
                                key={tag.name}
                                variant={"secondary"}
                                className=""
                            >
                                {tag.name}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* --- SECTION FOR THE "CREATE REPORT" BUTTON --- */}
            {/* The isEventCreator check has been removed */}
            {eventHasEnded && (
                <section className="wrapper my-8">
                    <Button asChild className="button w-full sm:w-fit" size="lg">
                        <Link href={`/event/${event._id}/report`}>
                            Create Report
                        </Link>
                    </Button>
                </section>
            )}
            {/* --- END OF SECTION --- */}

            <div className="mt-10">
                <h2 className="text-4xl max-sm:text-2xl mt-3 text-center text-primary font-bold">
                    Related Events
                </h2>
                <br />
                {relatedEvents.length > 0 ? (
                    <EventCards events={relatedEvents} />
                ) : (
                    <NoResults
                        title={"No Related Events Found"}
                        desc={""}
                        link={"/#categories"}
                        linkTitle={"Explore Events"}
                    />
                )}
            </div>
        </div>
    );
};

export default Page;