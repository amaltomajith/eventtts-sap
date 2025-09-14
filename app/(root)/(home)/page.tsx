// app/(root)/(home)/page.tsx

import Categories from "@/components/shared/Categories";
import EventCards from "@/components/shared/EventCards";
import NoResults from "@/components/shared/NoResults";
import Pagination from "@/components/shared/Pagination";
import SearchBar from "@/components/shared/SearchBar";
import { getCategoryByName } from "@/lib/actions/category.action";
import { getEvents, getEventsByCategory } from "@/lib/actions/event.action";

interface Props {
	searchParams: { [key: string]: string | undefined };
}

export default async function Home({ searchParams }: Props) {
	// ✅ FIX: Await searchParams at the top
	const awaitedSearchParams = await searchParams;

	const page = Number(awaitedSearchParams.page) || 1;
	const searchText = awaitedSearchParams.q || "";
	const category = awaitedSearchParams.category || "";

	let events = [];
	let totalPages = 0;

	try {
		if (category) {
			const categoryDoc = await getCategoryByName(category);
			if (categoryDoc) {
				events = await getEventsByCategory(categoryDoc._id);
			}
		} else {
			const result = await getEvents(searchText, page);
			events = result.events;
			totalPages = result.totalPages;
		}
	} catch (error) {
		console.error("Failed to fetch events:", error);
	}

	return (
		<>
			<h2 className="text-4xl max-sm:text-2xl font-bold text-center text-primary bg-clip-text mb-10 pt-20">
				Search for Events in your Campus
			</h2>
			<div className="flex justify-center items-center mb-16">
				<SearchBar
					route="/"
					placeholder="Search title..."
					otherClasses="w-96"
				/>
			</div>
			<Categories />
			{events.length > 0 ? (
				<EventCards events={events} />
			) : (
				<NoResults
					title={"No events found"}
					desc={"Try a different search or check back later!"}
					link={"/"}
					linkTitle={"Explore All Events"}
				/>
			)}
			<Pagination
				page={page}
				totalPages={totalPages}
			/>
		</>
	);
}