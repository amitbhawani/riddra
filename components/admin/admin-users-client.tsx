"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { formatAdminDateTime, formatAdminStorageDetail } from "@/lib/admin-time";
import type { ProductUserProfile } from "@/lib/user-product-store";
import {
  editorAssignableProductCapabilities,
  getDefaultCapabilitiesForRole,
  productUserCapabilityOptions,
  type ProductUserCapability,
} from "@/lib/product-permissions";
import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";

function formatMembershipTierLabel(tier: string) {
  if (tier === "pro-max") {
    return "Pro Max";
  }

  if (tier === "pro") {
    return "Pro";
  }

  if (tier === "free") {
    return "Free";
  }

  return tier
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminUsersClient({
  initialUsers,
  membershipTiers,
  currentAdminEmail,
}: {
  initialUsers: ProductUserProfile[];
  membershipTiers: string[];
  currentAdminEmail?: string | null;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({
    email: "",
    name: "",
    profileVisible: true,
    membershipTier: membershipTiers[0] ?? "free",
    role: "user" as ProductUserProfile["role"],
    capabilities: [] as ProductUserCapability[],
  });
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    label: string;
    text: string;
    detail?: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const normalizedCurrentAdminEmail = currentAdminEmail?.trim().toLowerCase() ?? null;

  const sortedUsers = useMemo(
    () =>
      [...users]
        .filter((user) => {
          const lowered = query.trim().toLowerCase();
          if (!lowered) {
            return true;
          }

          return [user.name, user.email, user.username, user.membershipTier, user.role]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(lowered));
        })
        .sort((left, right) => {
          const leftSortAt = left.updatedAt > left.lastActiveAt ? left.updatedAt : left.lastActiveAt;
          const rightSortAt = right.updatedAt > right.lastActiveAt ? right.updatedAt : right.lastActiveAt;
          return rightSortAt.localeCompare(leftSortAt);
        }),
    [query, users],
  );

  function resetForm() {
    setForm({
      email: "",
      name: "",
      profileVisible: true,
      membershipTier: membershipTiers[0] ?? "free",
      role: "user",
      capabilities: [],
    });
    setEditingEmail(null);
  }

  function loadUserIntoForm(user: ProductUserProfile) {
    setEditingEmail(user.email);
    setForm({
      email: user.email,
      name: user.name,
      profileVisible: user.profileVisible,
      membershipTier: user.membershipTier || membershipTiers[0] || "free",
      role: user.role,
      capabilities: user.role === "editor" ? user.capabilities : [],
    });
    setBanner(null);
  }

  function saveUser() {
    startTransition(async () => {
      setBanner(null);
      const normalizedEmail = form.email.trim().toLowerCase();
      const normalizedName = form.name.trim();
      const existingUser =
        users.find((item) => item.email.toLowerCase() === normalizedEmail) ?? null;

      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setBanner({
          tone: "danger",
          label: "Validation",
          text: "Enter a valid email address before saving this user.",
        });
        return;
      }

      if (!normalizedName) {
        setBanner({
          tone: "danger",
          label: "Validation",
          text: "Name is required so operators can recognize this user in the registry.",
        });
        return;
      }

      if (
        existingUser &&
        existingUser.role !== form.role &&
        typeof window !== "undefined" &&
        !window.confirm(
          `Change ${existingUser.email} from ${existingUser.role} to ${form.role}?`,
        )
      ) {
        return;
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          email: normalizedEmail,
          name: normalizedName,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            profile?: ProductUserProfile;
            users?: ProductUserProfile[];
            operation?: "created" | "updated";
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.profile || !data.users?.length) {
        setBanner({
          tone: "danger",
          label: "Save failed",
          text: data?.error ?? "Could not persist the user profile right now.",
        });
        return;
      }

      setUsers(data.users);
      resetForm();
      router.refresh();
      setBanner({
        tone: "success",
        label: data.operation === "created" ? "Created new user" : "Updated existing user",
        text: `${data.profile.email} is now saved with role ${data.profile.role} and tier ${data.profile.membershipTier || "free"}.`,
        detail: formatAdminStorageDetail(data.storageMode, data.savedAt),
      });
    });
  }

  function toggleProfileVisibility(user: ProductUserProfile) {
    startTransition(async () => {
      setBanner(null);
      const nextVisibility = !user.profileVisible;

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          profileVisible: nextVisibility,
          membershipTier: user.membershipTier || membershipTiers[0] || "free",
          role: user.role,
          capabilities: user.role === "editor" ? user.capabilities : [],
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            profile?: ProductUserProfile;
            users?: ProductUserProfile[];
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.profile || !data.users?.length) {
        setBanner({
          tone: "danger",
          label: "Update failed",
          text: data?.error ?? "Could not update the profile visibility right now.",
        });
        return;
      }

      setUsers(data.users);
      router.refresh();
      setBanner({
        tone: "success",
        label: nextVisibility ? "Profile shown" : "Profile hidden",
        text: nextVisibility
          ? `${user.name} can appear again on the public profile route.`
          : `${user.name} is now hidden from the public profile route.`,
        detail: formatAdminStorageDetail(data.storageMode, data.savedAt),
      });
    });
  }

  function removeUser(user: ProductUserProfile) {
    if (normalizedCurrentAdminEmail && normalizedCurrentAdminEmail === user.email.toLowerCase()) {
      setBanner({
        tone: "danger",
        label: "Blocked",
        text: "You cannot remove the admin account you are currently using.",
      });
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove ${user.email}? This also clears their saved local profile, watchlist, portfolio, bookmarks, and recent-view memory.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      setBanner(null);

      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(user.email)}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            removedProfile?: ProductUserProfile;
            users?: ProductUserProfile[];
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.removedProfile || !data.users) {
        setBanner({
          tone: "danger",
          label: "Remove failed",
          text: data?.error ?? "Could not remove this user right now.",
        });
        return;
      }

      setUsers(data.users);
      if (editingEmail?.toLowerCase() === user.email.toLowerCase()) {
        resetForm();
      }
      router.refresh();
      setBanner({
        tone: "success",
        label: "User removed",
        text: `${data.removedProfile.email} has been removed from the user registry.`,
        detail: formatAdminStorageDetail(data.storageMode, data.savedAt, "removed"),
      });
    });
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.label}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}

      <AdminSectionCard
        title={editingEmail ? "Edit user profile" : "Create or update a user profile"}
        description="Set the operator role, membership tier, and name for any signed-in account email."
      >
        {editingEmail ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2">
            <AdminBadge label="Editing existing user" tone="info" />
            <p className="text-[12px] leading-5 text-[#4b5563]">
              Changes will update {editingEmail}. Change the email to create a separate user instead.
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="user@example.com"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af]"
          />
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Full name"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af]"
          />
          <select
            value={form.membershipTier}
            onChange={(event) =>
              setForm((current) => ({ ...current, membershipTier: event.target.value }))
            }
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          >
            {[...new Set(["free", ...membershipTiers])].map((tier) => (
              <option key={tier} value={tier}>
                {formatMembershipTierLabel(tier)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as ProductUserProfile["role"],
                  capabilities:
                    event.target.value === "editor"
                      ? getDefaultCapabilitiesForRole("editor")
                      : [],
                }))
              }
              className="h-9 flex-1 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            >
              <option value="user">User</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={saveUser}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
            >
              {isPending ? "Saving..." : editingEmail ? "Update user" : "Save user"}
            </button>
            {editingEmail ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-[13px] font-medium text-[#111827]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        <label className="mt-3 flex items-start gap-2 rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-[13px] text-[#111827]">
          <input
            type="checkbox"
            checked={form.profileVisible}
            onChange={(event) =>
              setForm((current) => ({ ...current, profileVisible: event.target.checked }))
            }
            className="mt-0.5 h-4 w-4 rounded border border-[#cbd5e1]"
          />
          <span className="space-y-0.5">
            <span className="block font-medium text-[#111827]">Public profile visible</span>
            <span className="block text-[11px] leading-4 text-[#6b7280]">
              Turn this off when the username route should stop appearing publicly, while keeping the account and backend record intact.
            </span>
          </span>
        </label>

        {form.role === "editor" ? (
          <div className="mt-3 rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              Editor capabilities
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {productUserCapabilityOptions.map((option) => (
                editorAssignableProductCapabilities.includes(option.value) ? (
                <label
                  key={option.value}
                  className="flex items-start gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111827]"
                >
                  <input
                    type="checkbox"
                    checked={form.capabilities.includes(option.value)}
                    onChange={(event) =>
                      setForm((current) => {
                        const next = new Set(current.capabilities);
                        if (event.target.checked) {
                          next.add(option.value);
                        } else {
                          next.delete(option.value);
                        }
                        return {
                          ...current,
                          capabilities: Array.from(next),
                        };
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded border border-[#cbd5e1]"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium text-[#111827]">{option.label}</span>
                    <span className="block text-[11px] leading-4 text-[#6b7280]">{option.note}</span>
                  </span>
                </label>
                ) : null
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[#6b7280]">
              Editors can work in content and media, but publish, memberships, settings, refresh jobs, and approvals stay admin-only.
            </p>
          </div>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard
        title="User registry"
        description="Profiles, roles, membership tiers, public profile visibility, and quick actions to edit, open, hide, or remove a user."
      >
        <div className="mb-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, username, email, role, or tier"
            className="h-10 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af]"
          />
        </div>
        {sortedUsers.length ? (
          <AdminSimpleTable
            columns={["User", "Role", "Capabilities", "Tier", "Profile", "Created", "Updated", "Last active", "Actions"]}
            rows={sortedUsers.map((user) => {
              const isCurrentAdmin =
                normalizedCurrentAdminEmail !== null &&
                normalizedCurrentAdminEmail === user.email.toLowerCase();

              return [
                <div key={user.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-[#111827]">{user.name}</p>
                    {isCurrentAdmin ? <AdminBadge label="Signed-in admin" tone="warning" /> : null}
                  </div>
                  <p className="text-xs leading-5 text-[#1B3A6B]">@{user.username}</p>
                  <p className="text-xs leading-5 text-[#6b7280]">{user.email}</p>
                </div>,
                <AdminBadge
                  key={`${user.id}-role`}
                  label={user.role}
                  tone={
                    user.role === "admin"
                      ? "danger"
                      : user.role === "editor"
                        ? "warning"
                        : "info"
                  }
                />,
                <div key={`${user.id}-capabilities`} className="flex flex-wrap gap-1">
                  {user.role === "admin" ? (
                    <AdminBadge label="All capabilities" tone="danger" />
                  ) : user.capabilities.length ? (
                    user.capabilities.map((capability) => {
                      const meta = productUserCapabilityOptions.find((option) => option.value === capability);
                      return (
                        <AdminBadge
                          key={`${user.id}-${capability}`}
                          label={meta?.label ?? capability}
                          tone="info"
                        />
                      );
                    })
                  ) : (
                    <span className="text-[12px] text-[#6b7280]">No editor capabilities</span>
                  )}
                </div>,
                <span key={`${user.id}-tier`} className="text-[13px] text-[#111827]">
                  {user.membershipTier || "free"}
                </span>,
                <div key={`${user.id}-profile-visible`} className="flex flex-wrap gap-1">
                  <AdminBadge
                    label={user.profileVisible ? "Visible" : "Hidden"}
                    tone={user.profileVisible ? "success" : "default"}
                  />
                  {user.profileVisible ? (
                    <span className="text-[12px] text-[#6b7280]">Public profile route is live</span>
                  ) : (
                    <span className="text-[12px] text-[#6b7280]">Public profile route is hidden</span>
                  )}
                </div>,
                <span key={`${user.id}-created`} className="text-[13px] text-[#111827]">
                  {formatAdminDateTime(user.createdAt)}
                </span>,
                <span key={`${user.id}-updated`} className="text-[13px] text-[#111827]">
                  {formatAdminDateTime(user.updatedAt)}
                </span>,
                <span key={`${user.id}-active`} className="text-[13px] text-[#111827]">
                  {formatAdminDateTime(user.lastActiveAt)}
                </span>,
                <div key={`${user.id}-actions`} className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadUserIntoForm(user)}
                    className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                  >
                    Edit
                  </button>
                  {user.profileVisible ? (
                    <Link
                      href={`/user/${user.username}`}
                      className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                    >
                      Open profile
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleProfileVisibility(user)}
                    disabled={isPending}
                    className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {user.profileVisible ? "Hide profile" : "Show profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUser(user)}
                    disabled={isPending || isCurrentAdmin}
                    className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-medium ${
                      isCurrentAdmin
                        ? "border-[#d1d5db] bg-[#f9fafb] text-[#9ca3af]"
                        : "border-[#ef4444] bg-white text-[#b91c1c]"
                    } disabled:cursor-not-allowed disabled:opacity-80`}
                  >
                    {isCurrentAdmin ? "Signed-in admin" : "Remove"}
                  </button>
                </div>,
              ];
            })}
          />
        ) : (
          <AdminEmptyState
            title="No user profiles yet"
            description="Profiles will appear here as soon as a member signs in or an operator creates a user role."
          />
        )}
      </AdminSectionCard>
    </div>
  );
}
