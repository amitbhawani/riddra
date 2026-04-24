import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";

export const metadata: Metadata = {
  title: "Admin Help",
  description: "Plain-language help for editing records, access settings, overrides, refresh jobs, and global-site objects in the Riddra admin.",
};

export default function AdminHelpPage() {
  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Help", href: "/admin/help" },
        ]}
        eyebrow="Help"
        title="Admin help and editing guide"
        description="A simple guide for non-technical operators using the Riddra CMS. Start here if you are unsure where to edit something or what the advanced controls do."
        actions={<AdminActionLink href="/admin/content" label="Open content workspace" tone="primary" />}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="What each admin section does"
          description="Use the main sidebar like a CMS, not like a developer tool."
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li><span className="font-medium text-[#111827]">Dashboard:</span> recent edits, refresh failures, overdue jobs, and queues that need attention.</li>
            <li><span className="font-medium text-[#111827]">Content:</span> find and edit stocks, funds, indices, courses, webinars, newsletters, and other records.</li>
            <li><span className="font-medium text-[#111827]">Memberships:</span> manage access plans and decide which content is free, member-only, or tier-gated.</li>
            <li><span className="font-medium text-[#111827]">Global Site:</span> edit banners, route strips, support blocks, and other reusable public-site content.</li>
            <li><span className="font-medium text-[#111827]">Imports, manual changes, and refresh jobs:</span> advanced operator areas for source-driven content.</li>
          </ul>
        </AdminSectionCard>

        <AdminSectionCard
          title="How editing works"
          description="Editors now follow the same broad order that the public page uses."
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li>Start with the top sections such as <span className="font-medium text-[#111827]">Hero / identity</span> and the main content sections.</li>
            <li>Update the public-facing fields first. These are the sections most people should edit day to day.</li>
            <li>Use <span className="font-medium text-[#111827]">Access and publishing</span> when the page should move from draft to review, approval, or live.</li>
            <li>Editors send changes into <span className="font-medium text-[#111827]">Approvals</span>. Admins make the final approve or reject decision for live content.</li>
            <li>Open the collapsed <span className="font-medium text-[#111827]">Advanced</span> panels only when you need source settings, refresh timing, or manual-change controls.</li>
          </ul>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <AdminSectionCard
          title="How to edit a stock page"
          description="A stock editor is arranged to match the stock page reading flow."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li>Edit <span className="font-medium text-[#111827]">Hero / identity</span> for company name, slug, symbol, and benchmark mapping.</li>
            <li>Edit <span className="font-medium text-[#111827]">Performance, fundamentals, and support</span> for summary, facts, fundamentals, ownership, peers, news support, and FAQs.</li>
            <li>Edit <span className="font-medium text-[#111827]">Access and publishing</span> when the route should be draft, review, or published.</li>
            <li>Use <span className="font-medium text-[#111827]">Documents and traceable links</span> for filings, source links, and references.</li>
          </ul>
        </AdminSectionCard>

        <AdminSectionCard
          title="How to edit a course"
          description="Courses are structured so learning content is easier to manage without code."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li>Edit <span className="font-medium text-[#111827]">Hero / course summary</span> for the main title, subtitle, cover, instructor, and audience fit.</li>
            <li>Edit <span className="font-medium text-[#111827]">Modules and lessons</span> for structure, outcomes, and lesson ordering.</li>
            <li>Edit <span className="font-medium text-[#111827]">Lesson content and embeds</span> for YouTube URLs, downloads, callouts, and preview lesson support.</li>
            <li>Use <span className="font-medium text-[#111827]">Membership and access</span> if the course should be public, teaser-based, or tier-gated.</li>
          </ul>
        </AdminSectionCard>

        <AdminSectionCard
          title="How to edit a webinar"
          description="Webinars separate event timing from replay and content support."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li>Edit <span className="font-medium text-[#111827]">Hero / webinar summary</span> for title, speaker, cover, and summary.</li>
            <li>Edit <span className="font-medium text-[#111827]">Event timing and replay</span> for the live date, timezone, registration state, and replay status.</li>
            <li>Edit <span className="font-medium text-[#111827]">Agenda, assets, and replay support</span> for the body, agenda, registration link, replay URL, and downloadable resources.</li>
            <li>Use <span className="font-medium text-[#111827]">Membership and access</span> when the webinar or replay should be locked or member-only.</li>
          </ul>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="Source data versus manual changes"
          description="These controls decide whether a live page value comes from the source feed or from an editor's saved change."
          collapsible
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <AdminBadge label="Uses source data" tone="info" />
              <AdminBadge label="Manual live" tone="warning" />
              <AdminBadge label="Temporary manual" tone="warning" />
              <AdminBadge label="Manual locked" tone="danger" />
            </div>
            <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
              <li><span className="font-medium text-[#111827]">Uses source data:</span> the imported or synced value is currently the live page value.</li>
              <li><span className="font-medium text-[#111827]">Manual live:</span> your edited value is currently live instead of the source value.</li>
              <li><span className="font-medium text-[#111827]">Temporary manual:</span> your edited value is live for now, but a later refresh can replace it.</li>
              <li><span className="font-medium text-[#111827]">Manual locked:</span> your edited value stays live until an operator unlocks it.</li>
            </ul>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Users, media, preview, and settings"
          description="These newer system areas support the wider product platform beyond normal page editing."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li><span className="font-medium text-[#111827]">Users:</span> assign admin, editor, or user roles and set a membership tier for each account.</li>
            <li><span className="font-medium text-[#111827]">Media Library:</span> upload images or register external image URLs so they can be reused across courses, webinars, SEO, and campaigns.</li>
            <li><span className="font-medium text-[#111827]">Preview draft:</span> open a temporary preview route before publishing live.</li>
            <li><span className="font-medium text-[#111827]">Version comparison:</span> compare the current editor state with the last saved version and use <span className="font-medium text-[#111827]">Revert</span> to restore it.</li>
            <li><span className="font-medium text-[#111827]">Settings:</span> manage site name, default SEO, support routes, and global feature toggles.</li>
          </ul>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="How to know a save is real"
          description="Use these trust checks instead of guessing."
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li><span className="font-medium text-[#111827]">Save banners:</span> important editor and admin screens now show clear success or failure states after a real write attempt.</li>
            <li><span className="font-medium text-[#111827]">Activity Log:</span> open <span className="font-medium text-[#111827]">Activity Log</span> to see the newest user, content, settings, membership, and refresh-job actions.</li>
            <li><span className="font-medium text-[#111827]">System Health and Readiness:</span> use these to understand whether an issue is a real backend blocker or just a known migration/runtime follow-up.</li>
          </ul>
        </AdminSectionCard>

        <AdminSectionCard
          title="Durable versus fallback state"
          description="The backend will now tell you which path is active."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li><span className="font-medium text-[#111827]">DB-first path active:</span> the area is writing through the durable backend path and local JSON is only a mirror or safety net.</li>
            <li><span className="font-medium text-[#111827]">Local fallback mode:</span> saves still persist locally, but hosted proof and production readiness should not be considered complete yet.</li>
            <li><span className="font-medium text-[#111827]">Safe to ignore for now:</span> if a schema blocker is clearly explained in System Health or Readiness, everyday editing can still continue while the migration follow-up remains visible.</li>
          </ul>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="How CSV import works"
          description="Use imports when you want to create or update many drafts without filling the long editor form row by row."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li><span className="font-medium text-[#111827]">Download the sample CSV first:</span> the column names match the real editor sections for that family.</li>
            <li><span className="font-medium text-[#111827]">Upload and check the file:</span> the importer will preview matching, row warnings, and missing required columns before anything is saved.</li>
            <li><span className="font-medium text-[#111827]">Rows save as drafts:</span> import creates or updates draft/editorial records in the normal editor.</li>
            <li><span className="font-medium text-[#111827]">Editors send imported drafts for approval:</span> admins approve them from the approvals page before anything can move forward.</li>
            <li><span className="font-medium text-[#111827]">Repeated fields use simple separators:</span> import help on the page explains formats such as <span className="font-medium text-[#111827]">Label | Value</span> and item separators like <span className="font-medium text-[#111827]">;;</span>.</li>
          </ul>
        </AdminSectionCard>

        <AdminSectionCard
          title="Keep templates aligned"
          description="Use this checklist whenever a family editor changes so imports stay trustworthy."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li>Update the import template when the editor gets a new editable field.</li>
            <li>Update the parser and validation so the new field is imported safely.</li>
            <li>Update the sample CSV, import help text, and repeated-field examples.</li>
            <li>Re-test the full draft to approval to publish workflow before calling the family complete.</li>
            <li>Use the repo note in <span className="font-medium text-[#111827]">docs/IMPORT_TEMPLATE_ALIGNMENT_CHECKLIST.md</span> if you need the full reminder outside admin.</li>
          </ul>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-1">
        <AdminSectionCard
          title="When to use advanced settings"
          description="Most operators should not need these controls during routine editing."
          collapsible
          defaultOpen={false}
        >
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li>Use <span className="font-medium text-[#111827]">Advanced source mapping</span> only when source labels, source links, or source tracing are incorrect.</li>
            <li>Use <span className="font-medium text-[#111827]">Advanced refresh settings</span> only when cadence, source dependency, or job timing needs operator review.</li>
            <li>Use the manual-change matrix only when a saved page value must stay different from the current source value.</li>
            <li>Do not casually change advanced settings if a page is already healthy and publishing correctly.</li>
          </ul>
        </AdminSectionCard>
      </div>
    </AdminPageFrame>
  );
}
