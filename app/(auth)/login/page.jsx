"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/useAuth";
import Field, { inputClass } from "@/components/Field";
import Button from "@/components/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setServerError("");
    try {
      await login(values);
      router.replace("/");
    } catch (err) {
      setServerError(err.message || "Couldn't log in. Check your details.");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl">Log in</h1>
      <p className="mt-1 text-sm text-clay">Event leads and team members sign in here.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Field label="Email" tone="paper" error={errors.email && "Enter a valid email."}>
          <input
            type="email"
            {...register("email", { required: true })}
            className={inputClass("paper", !!errors.email)}
            placeholder="you@studio.com"
          />
        </Field>
        <Field label="Password" tone="paper" error={errors.password && "Password is required."}>
          <input
            type="password"
            {...register("password", { required: true })}
            className={inputClass("paper", !!errors.password)}
            placeholder="••••••••"
          />
        </Field>

        {serverError && <p className="text-sm text-safelight">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-clay">
        Leading an event for the first time?{" "}
        <Link href="/register" className="text-safelight hover:underline">
          Register as admin
        </Link>
      </p>
    </div>
  );
}
