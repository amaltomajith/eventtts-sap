import EventForm from "@/components/shared/EventForm";
import { getUserByClerkId, getUserById } from "@/lib/actions/user.action";
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

	return (
		<>
			<EventForm
				userId={user._id}
				type="create"
			/>
		</>
	);
};

export default Page;
