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
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Event leads and team members sign in here.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Field label="Email" error={errors.email && "Enter a valid email."}>
          <input
            type="email"
            {...register("email", { required: true })}
            className={inputClass(null, !!errors.email)}
            placeholder="you@studio.com"
          />
        </Field>
        <Field label="Password" error={errors.password && "Password is required."}>
          <input
            type="password"
            {...register("password", { required: true })}
            className={inputClass(null, !!errors.password)}
            placeholder="••••••••"
          />
        </Field>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Leading an event for the first time?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Register as admin
        </Link>
      </p>
    </div>
  );
}
