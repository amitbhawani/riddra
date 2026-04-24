import { getLaunchApprovals } from "@/lib/launch-approvals";
import { getLaunchBlockerLedger } from "@/lib/launch-blocker-ledger";

type OwnerInboxLane = {
  owner: string;
  blockerCount: number;
  approvalCount: number;
  urgency: "Critical" | "Active";
  summary: string;
  href: string;
};

function summarizeOwner(owner: string) {
  switch (owner) {
    case "User":
      return {
        summary:
          "Credentials, provider activation, payment setup, and any final external approvals still depend on the user side before launch claims can become operational.",
        href: "/admin/external-activation-board",
      };
    case "Shared":
      return {
        summary:
          "Shared blockers still need cross-functional closure across trust, scope, support, and broad-public launch posture before the final go decision is safe.",
        href: "/admin/launch-blocker-ledger",
      };
    case "Product owner":
      return {
        summary:
          "Public posture and launch-scope approval still need a final product-owner decision so beta claims and broad-public messaging stay deliberate.",
        href: "/admin/launch-approvals",
      };
    case "Engineering":
      return {
        summary:
          "Engineering-owned approvals still center on connected auth, environment truth, and protected-route confidence before public traffic scales up.",
        href: "/admin/launch-approvals",
      };
    case "Support / operations":
      return {
        summary:
          "Support and recovery posture still need a credible real-world handoff so the public experience is not a dead end when something breaks.",
        href: "/admin/launch-approvals",
      };
    case "Payments owner":
      return {
        summary:
          "Payments visibility still needs a final owner check so pricing, checkout, and billing claims match what is actually activated.",
        href: "/admin/launch-approvals",
      };
    case "Growth / communications":
      return {
        summary:
          "Messaging and outbound channels still need a usable delivery path so launch communication does not outrun support and onboarding truth.",
        href: "/admin/launch-approvals",
      };
    default:
      return {
        summary:
          "This owner still has launch-critical work open, and the final public posture should not assume it is cleared until it is explicitly closed.",
        href: "/admin/launch-blocker-ledger",
      };
  }
}

export function getLaunchOwnerInbox() {
  const blockerLedger = getLaunchBlockerLedger();
  const approvals = getLaunchApprovals().approvals.filter((item) => item.status === "Pending");

  const owners = new Set<string>([
    ...blockerLedger.items.map((item) => item.owner),
    ...approvals.map((item) => item.owner),
  ]);

  const lanes: OwnerInboxLane[] = Array.from(owners).map((owner) => {
    const blockerCount = blockerLedger.items.filter((item) => item.owner === owner).length;
    const approvalCount = approvals.filter((item) => item.owner === owner).length;
    const { summary, href } = summarizeOwner(owner);

    return {
      owner,
      blockerCount,
      approvalCount,
      urgency: blockerCount + approvalCount > 1 ? "Critical" : "Active",
      summary,
      href,
    };
  });

  return {
    lanes,
    owners: lanes.length,
    criticalOwners: lanes.filter((lane) => lane.urgency === "Critical").length,
    pendingApprovals: approvals.length,
  };
}
