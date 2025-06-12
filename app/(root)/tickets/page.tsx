import NoResults from "@/components/shared/NoResults";
import OrderCards from "@/components/shared/OrderCards";
import { getOrdersByUserId } from "@/lib/actions/order.action";
import { getUserByClerkId } from "@/lib/actions/user.action";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import React from "react";

const Page = async () => {
	const { userId } = auth();

	if (!userId) {
		redirect("/sign-in");
	}

	let user;
	try {
		user = await getUserByClerkId(userId);
	} catch (error) {
		// Handle case where user doesn't exist in database yet
		// This can happen right after signup before webhook creates the user
		console.log("User not found in database yet, redirecting to sign-in:", error);
		redirect("/sign-in");
	}

	const events = await getOrdersByUserId(user._id);

	const upcomingEvents = events.filter((event: any) => {
		return new Date(event.event.startDate) > new Date();
	});

	const pastEvents = events.filter((event: any) => {
		return new Date(event.event.startDate) < new Date();
	});

	return (
		<div className="flex flex-col gap-10">
			<h3 className="text-3xl max-sm:text-xl font-bold text-center text-primary">
				Upcoming Events
			</h3>
			{upcomingEvents.length > 0 ? (
				<OrderCards events={upcomingEvents} />
			) : (
				<NoResults
					title={"You have no upcoming events"}
					desc={""}
					link={"/#categories"}
					linkTitle={"Explore Events"}
				/>
			)}
			<h3 className="text-3xl max-sm:text-xl font-bold text-center text-primary">
				Past Events
			</h3>
			{pastEvents.length > 0 ? (
				<OrderCards events={pastEvents} />
			) : (
				<NoResults
					title={"You don't have any past events"}
					desc={""}
				// link={"/#categories"}
				// linkTitle={"Explore Events"}
				/>
			)}
		</div>
	);
};

export default Page;
