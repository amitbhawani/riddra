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
    <div className="riddra-auth-form space-y-6">
      <div className="space-y-3">
        <h2 className="riddra-auth-form-title riddra-product-body text-[1.6rem] font-semibold tracking-tight text-[#1B3A6B]">{title}</h2>
        <p className="riddra-auth-copy riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.84)]">{description}</p>
      </div>

      <form action={formAction} onSubmit={validateSubmit} className="grid gap-4" noValidate>
        {googleAction ? (
          <button
            className="riddra-auth-google-button inline-flex items-center justify-center rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-white px-5 py-3 text-sm font-medium !text-[#1B3A6B] transition hover:border-[#D4853B] hover:!text-[#D4853B]"
            data-skip-client-validation="true"
            formAction={googleAction}
            type="submit"
          >
            Continue with Google
          </button>
        ) : null}

        {googleAction ? (
          <div className="riddra-auth-divider flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">
            <div className="riddra-auth-divider-line h-px flex-1 bg-[rgba(221,215,207,0.92)]" />
            <span>or continue with email</span>
            <div className="riddra-auth-divider-line h-px flex-1 bg-[rgba(221,215,207,0.92)]" />
          </div>
        ) : null}

        {includeName ? (
          <input
            className="riddra-auth-input w-full rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-[#1B3A6B] placeholder:text-[rgba(107,114,128,0.62)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-[rgba(27,58,107,0.2)] focus:ring-2 focus:ring-[rgba(27,58,107,0.08)]"
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
          className="riddra-auth-input w-full rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-[#1B3A6B] placeholder:text-[rgba(107,114,128,0.62)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-[rgba(27,58,107,0.2)] focus:ring-2 focus:ring-[rgba(27,58,107,0.08)]"
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
          <div className="riddra-auth-helper rounded-[12px] border border-[rgba(221,215,207,0.86)] bg-[rgba(248,246,242,0.86)] px-4 py-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            {emailHelperText}
          </div>
        ) : null}

        {clientError || state.error ? (
          <div
            id="auth-form-client-error"
            className="rounded-[12px] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[#B42318]"
          >
            {clientError ?? state.error}
          </div>
        ) : null}

        {queryError ? (
          <div className="rounded-[12px] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[#B42318]">
            {queryError}
          </div>
        ) : null}

        {state.success ? (
          <div className="rounded-[12px] border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.08)] px-4 py-3 text-sm text-[#166534]">
            {state.success}
          </div>
        ) : null}

        <button
          className="riddra-auth-submit-button inline-flex items-center justify-center rounded-[12px] bg-[#1B3A6B] px-5 py-3 text-sm font-medium !text-white transition hover:bg-[#264a83] hover:!text-white disabled:cursor-not-allowed disabled:opacity-70"
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
