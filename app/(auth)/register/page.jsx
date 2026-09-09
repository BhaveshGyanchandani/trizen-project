"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/useAuth";
import Field, { inputClass } from "@/components/Field";
import Button from "@/components/Button";

export default function RegisterPage() {
  const { register: registerAdmin } = useAuth();
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
      await registerAdmin(values);
      router.replace("/admin");
    } catch (err) {
      setServerError(err.message || "Couldn't register. Try a different email.");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl">Register as admin</h1>
      <p className="mt-1 text-sm text-clay">
        Admins create events, add team members, and publish galleries. Team
        members are added by their admin — they don&apos;t register here.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Field label="Name" tone="paper" error={errors.name && "Enter your name."}>
          <input
            {...register("name", { required: true })}
            className={inputClass("paper", !!errors.name)}
            placeholder="Priya Shah"
          />
        </Field>
        <Field label="Email" tone="paper" error={errors.email && "Enter a valid email."}>
          <input
            type="email"
            {...register("email", { required: true })}
            className={inputClass("paper", !!errors.email)}
            placeholder="you@studio.com"
          />
        </Field>
        <Field
          label="Password"
          tone="paper"
          error={errors.password && "Use at least 8 characters."}
        >
          <input
            type="password"
            {...register("password", { required: true, minLength: 8 })}
            className={inputClass("paper", !!errors.password)}
            placeholder="••••••••"
          />
        </Field>

        {serverError && <p className="text-sm text-safelight">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Create admin account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-clay">
        Already have an account?{" "}
        <Link href="/login" className="text-safelight hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
