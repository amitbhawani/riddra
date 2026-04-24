import { permanentRedirect } from "next/navigation";

export default function LegacyResultsCalendarPage() {
  permanentRedirect("/reports/results-calendar");
}
