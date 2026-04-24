import { Text } from "@react-email/components";
import * as React from "react";

import { TransactionalEmailLayout, listStyle, paragraphStyle } from "@/emails/layout";

export function SupportAcknowledgementEmail(props: {
  requesterEmail: string;
  topic: string;
  lane: string;
  urgency: string;
  note: string;
  accountSupportHref: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={`We received your ${props.lane.toLowerCase()} support request`}
      eyebrow="Support acknowledgement"
      title="Your support request is in the queue"
      intro={`We have recorded your request for "${props.topic}" and routed it into the private-beta support lane.`}
      ctaHref={props.accountSupportHref}
      ctaLabel="Open account support"
    >
      <Text style={paragraphStyle}>Requested by: {props.requesterEmail}</Text>
      <Text style={paragraphStyle}>Urgency: {props.urgency}</Text>
      <Text style={paragraphStyle}>Lane: {props.lane}</Text>
      <Text style={paragraphStyle}>Notes: {props.note}</Text>
    </TransactionalEmailLayout>
  );
}

export function SupportFollowUpEmail(props: {
  topic: string;
  nextTouchAt: string;
  preferredChannel: string;
  note: string;
  accountSupportHref: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={`Follow-up scheduled for ${props.topic}`}
      eyebrow="Support follow-up"
      title="Your next support touchpoint is scheduled"
      intro={`We scheduled the next support follow-up for "${props.topic}" and kept the preferred response path as ${props.preferredChannel.toLowerCase()}.`}
      ctaHref={props.accountSupportHref}
      ctaLabel="Review support lane"
    >
      <Text style={paragraphStyle}>Next touch: {props.nextTouchAt}</Text>
      <Text style={paragraphStyle}>Channel: {props.preferredChannel}</Text>
      <Text style={paragraphStyle}>Notes: {props.note}</Text>
    </TransactionalEmailLayout>
  );
}

export function SupportInboxNoticeEmail(props: {
  requesterEmail: string;
  topic: string;
  lane: string;
  urgency: string;
  preferredChannel: string;
  note: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={`New support request from ${props.requesterEmail}`}
      eyebrow="Operator inbox"
      title="New support request needs follow-through"
      intro={`A subscriber requested help for "${props.topic}" and the request has already been queued into the durable support lane.`}
      footer="Riddra support ops"
    >
      <Text style={paragraphStyle}>Requester: {props.requesterEmail}</Text>
      <Text style={paragraphStyle}>Lane: {props.lane}</Text>
      <Text style={paragraphStyle}>Urgency: {props.urgency}</Text>
      <Text style={paragraphStyle}>Preferred channel: {props.preferredChannel}</Text>
      <Text style={paragraphStyle}>Notes: {props.note}</Text>
    </TransactionalEmailLayout>
  );
}

export function ContactAcknowledgementEmail(props: {
  requesterName: string;
  topic: string;
  note: string;
  contactHref: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={`We received your ${props.topic.toLowerCase()} message`}
      eyebrow="Contact acknowledgement"
      title={`Thanks, ${props.requesterName}`}
      intro={`We received your message about "${props.topic}" and queued it into the private-beta contact lane for follow-through.`}
      ctaHref={props.contactHref}
      ctaLabel="Open contact page"
    >
      <Text style={paragraphStyle}>Your note: {props.note}</Text>
    </TransactionalEmailLayout>
  );
}

export function ContactInboxNoticeEmail(props: {
  requesterName: string;
  requesterEmail: string;
  topic: string;
  note: string;
  source: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={`New contact message from ${props.requesterName}`}
      eyebrow="Public contact inbox"
      title="A new contact message is waiting"
      intro={`A public contact request was submitted and queued for support handling from ${props.source}.`}
      footer="Riddra contact ops"
    >
      <Text style={paragraphStyle}>Name: {props.requesterName}</Text>
      <Text style={paragraphStyle}>Email: {props.requesterEmail}</Text>
      <Text style={paragraphStyle}>Topic: {props.topic}</Text>
      <Text style={paragraphStyle}>Message: {props.note}</Text>
    </TransactionalEmailLayout>
  );
}

export function NotificationSummaryEmail(props: {
  title: string;
  audienceScope: string;
  triggeredBy: string;
  note: string;
  accountHref: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={`Notification update: ${props.title}`}
      eyebrow="Notification summary"
      title={props.title}
      intro="A consent-aware notification event was processed for your account and is now available for review."
      ctaHref={props.accountHref}
      ctaLabel="Open consent center"
    >
      <Text style={paragraphStyle}>Audience scope: {props.audienceScope}</Text>
      <Text style={paragraphStyle}>Triggered by: {props.triggeredBy}</Text>
      <Text style={paragraphStyle}>Summary: {props.note}</Text>
    </TransactionalEmailLayout>
  );
}

export function AccountChangeAlertEmail(props: {
  headline: string;
  detail: string;
  changedFields: string[];
  accountHref: string;
}) {
  return (
    <TransactionalEmailLayout
      preview={props.headline}
      eyebrow="Account change alert"
      title={props.headline}
      intro={props.detail}
      ctaHref={props.accountHref}
      ctaLabel="Review account changes"
    >
      <Text style={paragraphStyle}>Changed fields:</Text>
      <ul style={listStyle}>
        {props.changedFields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </TransactionalEmailLayout>
  );
}
