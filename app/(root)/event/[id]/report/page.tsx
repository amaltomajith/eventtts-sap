// app/(root)/event/[id]/report/page.tsx

import ReportForm from "@/components/shared/ReportForm";
import { getEventById } from "@/lib/actions/event.action";
import { auth } from "@clerk/nextjs";

type ReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const ReportPage = async ({ params }: ReportPageProps) => {
  const { id } = await params;
  const { sessionClaims } = auth();
  const userId = sessionClaims?.userId as string;

  const event = await getEventById(id);

  if (!event) {
    return (
      <div className="wrapper text-center">
        <h1>Event not found</h1>
        <p>The event you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <>
      <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
        <h3 className="wrapper h3-bold text-center sm:text-left">
          Generate Event Report
        </h3>
      </section>

      <div className="wrapper my-8">
        <ReportForm eventId={id} userId={userId} event={JSON.parse(JSON.stringify(event))} />
      </div>
    </>
  );
};

export default ReportPage;