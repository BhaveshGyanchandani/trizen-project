"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "./Button";
import { inputClass } from "./Field";

/**
 * 6-digit PIN entry form for the public gallery landing page. Validates
 * the format client-side, calls `onSubmit(pin)` (expected to verify the
 * PIN with the server and throw on failure), and surfaces either the
 * client-side format error or the server's rejection message.
 */
export default function PinEntryForm({ onSubmit }) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async ({ pin }) => {
    setServerError("");
    try {
      await onSubmit(pin);
    } catch (err) {
      setServerError(err.message || "Incorrect PIN. Try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="w-full max-w-xs">
      <input
        {...register("pin", {
          required: true,
          pattern: /^\d{6}$/,
        })}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        aria-label="6-digit gallery PIN"
        className={`${inputClass("paper", errors.pin || serverError)} text-center font-mono text-2xl tracking-[0.35em]`}
      />
      {errors.pin && (
        <p className="mt-2 text-center text-xs text-destructive">Enter the 6-digit PIN you were given.</p>
      )}
      {serverError && !errors.pin && (
        <p className="mt-2 text-center text-xs text-destructive">{serverError}</p>
      )}
      <Button type="submit" disabled={isSubmitting} className="mt-4 w-full">
        {isSubmitting ? "Checking…" : "View gallery"}
      </Button>
    </form>
  );
}
