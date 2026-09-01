import { Dashboard } from "@/components/dashboard";
import { sampleMessagesOfDay, sampleTimetable, sampleUntisMessages } from "@/lib/sample-timetable";

export const metadata = {
  title: "Stundenplan-Demo",
  description: "Untiplan mit vollständig synthetischen Beispieldaten ausprobieren",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <Dashboard displayName="Demo-Konto" filterStorageId="preview" initialWeek="2026-01-12" previewData={sampleTimetable} previewMessages={sampleMessagesOfDay} previewUntisMessages={sampleUntisMessages} />;
}
