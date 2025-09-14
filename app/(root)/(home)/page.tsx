import { auth } from "@clerk/nextjs";
import Categories from "@/components/shared/Categories";
import EventCards from "@/components/shared/EventCards";
import Pagination from "@/components/shared/Pagination";
import SearchBar from "@/components/shared/SearchBar";
import { getEvents } from "@/lib/actions/event.action";

// ✅ This is the definitive fix for the headers/searchParams error
export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ page?: string; q?: string; category?: string; }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const { userId } = auth();

  // Await searchParams in Next.js 15+
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const searchText = params.q || "";
  const category = params.category || "";

  const result = await getEvents(searchText, category, page);

  const events = result?.events || [];
  const totalPages = result?.totalPages || 0;

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

      <EventCards
        events={events}
        currentUserId={userId}
        emptyTitle="No Events Found"
        emptyStateSubtext="Come back later"
      />

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} />
      )}
    </>
  );
}