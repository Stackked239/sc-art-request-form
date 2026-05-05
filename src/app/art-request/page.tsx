import { getOpportunity } from "@/lib/salesforce";
import ConsultForm from "@/components/form/ConsultForm";

export default async function ConsultFormPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { opp_id } = await searchParams;

  if (!opp_id || typeof opp_id !== "string") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-bold uppercase">Invalid Link</h1>
        <p className="mt-4 max-w-md text-center text-neutral-600">
          This link is missing a valid opportunity ID.
        </p>
      </main>
    );
  }

  let opportunity;
  try {
    opportunity = await getOpportunity(opp_id);
  } catch {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-bold uppercase">Something Went Wrong</h1>
        <p className="mt-4 max-w-md text-center text-neutral-600">
          We couldn&apos;t load the opportunity data. Please try again later.
        </p>
      </main>
    );
  }

  return <ConsultForm opportunity={opportunity} />;
}
