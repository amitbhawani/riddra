"use client";

import { type FormEvent, type KeyboardEvent, type MouseEvent, useActionState, useState } from "react";

import type { AuthActionState } from "@/app/(auth)/actions";

type AuthFormProps = {
  title: string;
  description: string;
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
  includeName?: boolean;
  googleAction?: () => Promise<void>;
  emailHelperText?: string;
  queryError?: string;
};

const initialState: AuthActionState = {};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  includeName = false,
  googleAction,
  emailHelperText,
  queryError,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  function validateCurrentFields(form?: HTMLFormElement | null) {
    const formData = form ? new FormData(form) : null;
    const submittedFullName = String(formData?.get("full_name") ?? fullName);
    const submittedEmail = String(formData?.get("email") ?? email);

    if (includeName && submittedFullName.trim().length < 2) {
      setClientError("Enter your full name.");
      return false;
    }

    if (!submittedEmail.trim()) {
      setClientError("Enter your email address.");
      return false;
    }

    if (!isValidEmail(submittedEmail)) {
      setClientError("Enter a valid email address.");
      return false;
    }

    setClientError(null);
    return true;
  }

  function validateSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;

    if (submitter?.dataset.skipClientValidation === "true") {
      return;
    }

    if (!validateCurrentFields(event.currentTarget)) {
      event.preventDefault();
    }
  }

  function validateSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    if (!validateCurrentFields(event.currentTarget.form)) {
      event.preventDefault();
    }
  }

  function validateEnterKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !validateCurrentFields(event.currentTarget.form)) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="text-sm leading-7 text-mist/72">{description}</p>
      </div>

      <form action={formAction} onSubmit={validateSubmit} className="grid gap-4" noValidate>
        {googleAction ? (
          <button
            className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:border-white/24 hover:bg-white/[0.07]"
            data-skip-client-validation="true"
            formAction={googleAction}
            type="submit"
          >
            Continue with Google
          </button>
        ) : null}

        {googleAction ? (
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-mist/45">
            <div className="h-px flex-1 bg-white/10" />
            <span>or continue with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        ) : null}

        {includeName ? (
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-mist/40"
            name="full_name"
            placeholder="Full name"
            required
            value={fullName}
            onKeyDown={validateEnterKey}
            onChange={(event) => {
              setFullName(event.target.value);
              setClientError(null);
            }}
            aria-invalid={Boolean(clientError && includeName && fullName.trim().length < 2)}
          />
        ) : null}
        <input
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-mist/40"
          name="email"
          placeholder="Email address"
          type="email"
          required
          value={email}
          onKeyDown={validateEnterKey}
          onChange={(event) => {
            setEmail(event.target.value);
            setClientError(null);
          }}
          aria-invalid={Boolean(clientError && !isValidEmail(email))}
          aria-describedby={clientError ? "auth-form-client-error" : undefined}
        />

        {emailHelperText ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-mist/72">
            {emailHelperText}
          </div>
        ) : null}

        {clientError || state.error ? (
          <div id="auth-form-client-error" className="rounded-2xl border border-bloom/30 bg-bloom/10 px-4 py-3 text-sm text-white">
            {clientError ?? state.error}
          </div>
        ) : null}

        {queryError ? (
          <div className="rounded-2xl border border-bloom/30 bg-bloom/10 px-4 py-3 text-sm text-white">
            {queryError}
          </div>
        ) : null}

        {state.success ? (
          <div className="rounded-2xl border border-aurora/30 bg-aurora/10 px-4 py-3 text-sm text-white">
            {state.success}
          </div>
        ) : null}

        <button
          className="inline-flex items-center justify-center rounded-full bg-aurora px-5 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          onClick={validateSubmitClick}
          type="submit"
        >
          {pending ? "Please wait..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
