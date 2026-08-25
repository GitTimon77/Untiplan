import { notFound } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { sampleTimetable } from "@/lib/sample-timetable";

export const metadata = { title: "Stundenplan-Vorschau" };

export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Dashboard displayName="Vorschaukonto" filterStorageId="preview" initialWeek="2026-01-12" previewData={sampleTimetable} />;
}
