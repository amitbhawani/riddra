type SubscriberSurfaceTruthFlags = {
  hasLiveAuthContinuity: boolean;
  hasBillingCore: boolean;
  hasSupportDelivery: boolean;
};

type PublicTruthCopyOptions = {
  continuitySubject: string;
  handoffLabel: string;
  billingSubject: string;
  supportSubject: string;
};

export type PublicTruthCopy = {
  authReady: string;
  authPending: string;
  billingReady: string;
  billingPending: string;
  supportReady: string;
  supportPending: string;
};

export function getPublicTruthCopy({
  continuitySubject,
  handoffLabel,
  billingSubject,
  supportSubject,
}: PublicTruthCopyOptions): PublicTruthCopy {
  return {
    authReady: `Signed-in continuity is active enough to carry ${continuitySubject} into account and workspace flows.`,
    authPending: `Account continuity still needs hosted sign-in proof before the full ${handoffLabel} should be treated as durable.`,
    billingReady: `Commercial billing remains intentionally deferred during private beta, so ${billingSubject} can stay future-facing without implying live checkout.`,
    billingPending: `Commercial billing remains intentionally deferred during private beta, so ${billingSubject} should stay future-facing without implying live checkout.`,
    supportReady: `Support delivery is configured enough to begin testing real follow-up for ${supportSubject}.`,
    supportPending: `Support delivery still needs hosted proof before follow-through for ${supportSubject} should be treated as fully active.`,
  };
}

export function getPublicTruthItems(
  truth: SubscriberSurfaceTruthFlags,
  options: PublicTruthCopyOptions,
) {
  const copy = getPublicTruthCopy(options);

  return [
    truth.hasLiveAuthContinuity ? copy.authReady : copy.authPending,
    truth.hasBillingCore ? copy.billingReady : copy.billingPending,
    truth.hasSupportDelivery ? copy.supportReady : copy.supportPending,
  ];
}
