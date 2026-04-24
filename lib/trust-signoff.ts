import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export type TrustSignoffItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  detail: string;
  href: string;
};

export function getTrustSignoffItems(): TrustSignoffItem[] {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const hasSupportEmail = Boolean(config.supportEmail || config.contactEmail);
  const hasDelivery = delivery.configured;
  const hasPrivacyOwner = Boolean(config.privacyOwner);
  const hasTermsOwner = Boolean(config.termsOwner);
  const hasRiskDisclosure = Boolean(config.riskDisclosureUrl);
  const hasGrievanceContact = Boolean(config.grievanceOfficerEmail || config.grievanceOfficerName);

  return [
    {
      title: "Privacy and terms posture",
      status: hasPrivacyOwner && hasTermsOwner ? "In progress" : "Blocked",
      detail:
        hasPrivacyOwner && hasTermsOwner
          ? `Launch config now names ${config.privacyOwner} and ${config.termsOwner} as policy owners, but the final reviewed launch copy still needs explicit approval.`
          : "Trust pages are live, but privacy and terms still need named owners before broad-launch signoff is credible.",
      href: "/privacy",
    },
    {
      title: "Support contact credibility",
      status: hasSupportEmail ? "In progress" : "Blocked",
      detail: hasSupportEmail
        ? `Support contact is configured as ${config.supportEmail || config.contactEmail}, but response workflow and subscriber-recovery expectations still need final launch review.`
        : "Broad-public launch trust is blocked until the support contact is finalized and visibly stable across public surfaces.",
      href: "/contact",
    },
    {
      title: "Transactional reassurance layer",
      status: hasSupportEmail && hasDelivery ? "In progress" : "Blocked",
      detail:
        hasSupportEmail && hasDelivery
          ? "Support routing, Resend, and Trigger.dev all exist, so the next step is verifying signup, billing, and recovery emails as part of the trust path."
          : "Trust claims should stay conservative until support contact and email delivery can both back them up.",
      href: "/admin/communication-readiness",
    },
    {
      title: "Risk and grievance disclosure coverage",
      status: hasRiskDisclosure && hasGrievanceContact ? "In progress" : "Blocked",
      detail:
        hasRiskDisclosure && hasGrievanceContact
          ? "Risk disclosure and grievance ownership are now configured, but those details still need a final route-by-route visibility review before broad launch."
          : "Launch trust is still missing either risk-disclosure wiring or grievance ownership details from the config console.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Broad-launch copy discipline",
      status: "In progress",
      detail:
        "Public pages now read more like a real product, but broad-launch promises still need final review so messaging matches live data, billing, support, and mobile reality.",
      href: "/admin/announcement-readiness",
    },
  ];
}

export const trustSignoffRules = [
  "Trust pages should match real operational capacity, not aspirational launch language.",
  "Support and recovery claims should only be made when the communication stack can actually fulfill them.",
  "Reviewed legal copy is part of broad-launch readiness, not an optional polish item after promotion.",
  "Broad-public messaging should only promise what live data, subscriber truth, and support readiness can sustain together.",
];
