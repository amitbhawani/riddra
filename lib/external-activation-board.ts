import { getCallbackMatrix } from "@/lib/callback-matrix";
import { getCommunicationReadinessItems } from "@/lib/communication-readiness";
import { getCredentialMatrix } from "@/lib/credential-matrix";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";

export type ExternalActivationBoardLane = {
  title: string;
  ready: number;
  blocked: number;
  summary: string;
  href: string;
};

export function getExternalActivationBoard() {
  const credentialMatrix = getCredentialMatrix();
  const callbackMatrix = getCallbackMatrix();
  const communicationItems = getCommunicationReadinessItems();
  const commitments = getLaunchCommitmentItems();

  const lanes: ExternalActivationBoardLane[] = [
    {
      title: "Credentials and env keys",
      ready: credentialMatrix.present,
      blocked: credentialMatrix.missing,
      summary: "The exact env key inventory for auth, support, billing, email, and privileged backend work.",
      href: "/admin/credential-matrix",
    },
    {
      title: "Callback and redirect setup",
      ready: callbackMatrix.ready,
      blocked: callbackMatrix.pending,
      summary: "The exact local, primary-site, and Supabase redirect values needed to make auth activation work end to end.",
      href: "/admin/callback-matrix",
    },
    {
      title: "Support and delivery",
      ready: communicationItems.filter((item) => item.status === "Ready").length,
      blocked: communicationItems.filter((item) => item.status === "Blocked").length,
      summary: "The support address, email delivery stack, and communication posture needed before outside users are invited broadly.",
      href: "/admin/communication-readiness",
    },
    {
      title: "Broad-public commitments",
      ready: commitments.filter((item) => item.status === "Ready").length,
      blocked: commitments.filter((item) => item.status === "Blocked").length,
      summary: "The shared auth, payment, support, provider, and trust blockers that still determine whether launch promises are safe.",
      href: "/admin/launch-commitments",
    },
  ];

  return {
    lanes,
    ready: lanes.reduce((sum, lane) => sum + lane.ready, 0),
    blocked: lanes.reduce((sum, lane) => sum + lane.blocked, 0),
  };
}
