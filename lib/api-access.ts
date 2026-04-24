export type ApiAccessItem = {
  name: string;
  category: string;
  priority: "Now" | "Soon" | "Later";
  owner: "User" | "Shared";
  purpose: string;
  whatToCollect: string;
};

export const apiAccessItems: ApiAccessItem[] = [
  {
    name: "Supabase",
    category: "Core backend",
    priority: "Now",
    owner: "User",
    purpose: "Auth, Postgres, storage, and account-linked data foundation.",
    whatToCollect: "Project URL, anon key, service-role key, auth provider settings.",
  },
  {
    name: "Google Cloud OAuth",
    category: "Authentication",
    priority: "Now",
    owner: "User",
    purpose: "Google login for the launch-standard auth path.",
    whatToCollect: "OAuth client ID, client secret, authorized redirect URL for /auth/callback.",
  },
  {
    name: "Razorpay",
    category: "Payments",
    priority: "Now",
    owner: "User",
    purpose: "Subscriptions, payments, and future billing activation.",
    whatToCollect: "Test keys first, then live keys after business verification.",
  },
  {
    name: "Resend",
    category: "Email",
    priority: "Soon",
    owner: "User",
    purpose: "Transactional emails, login links, newsletters, and alert delivery.",
    whatToCollect: "API key and verified sending domain.",
  },
  {
    name: "Zerodha Kite Connect",
    category: "Broker connectivity",
    priority: "Soon",
    owner: "User",
    purpose: "Portfolio sync, holdings access, and later broker-linked workflows.",
    whatToCollect: "API key, app credentials, approval status, scope limits.",
  },
  {
    name: "ICICIdirect API",
    category: "Broker connectivity",
    priority: "Soon",
    owner: "User",
    purpose: "Portfolio sync and full-service investor workflows for ICICI users.",
    whatToCollect: "Developer access approval and API credentials.",
  },
  {
    name: "Meta WhatsApp Business Platform",
    category: "Notifications",
    priority: "Later",
    owner: "User",
    purpose: "WhatsApp alerts for high-signal reminders and engagement workflows.",
    whatToCollect: "Business verification status, app ID, access tokens, number setup.",
  },
];
