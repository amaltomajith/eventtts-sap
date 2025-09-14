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

  return (
    <>
      <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
        <h3 className="wrapper h3-bold text-center sm:text-left">
          Generate Event Report
        </h3>
      </section>

      <div className="wrapper my-8">
        <ReportForm eventId={id} userId={userId} event={event} />
      </div>
    </>
  );
};

export default ReportPage;