import { permanentRedirect } from "next/navigation";

export default function PrivateBetaPage() {
  permanentRedirect("/");
}
