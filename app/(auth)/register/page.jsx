"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/useAuth";
import { authAPI, eventsAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import Field, { inputClass } from "@/components/Field";
import Button from "@/components/Button";

function randomPassword() {
  return Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
}

export default function RegisterPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [regStatus, setRegStatus] = useState({ loading: true, adminExists: false, isAdmin: false });
  const [role, setRole] = useState("admin"); // 'admin' | 'team_member'
  const [events, setEvents] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [createdUser, setCreatedUser] = useState(null);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    authAPI
      .checkRegisterStatus()
      .then((data) => {
        setRegStatus({
          loading: false,
          adminExists: data?.adminExists || false,
          isAdmin: data?.isAdmin || false,
        });
        if (data?.isAdmin) {
          eventsAPI
            .list()
            .then((evtData) => setEvents(Array.isArray(evtData) ? evtData : evtData?.events || []))
            .catch(() => setEvents([]));
        }
      })
      .catch(() => {
        setRegStatus({ loading: false, adminExists: true, isAdmin: false });
      });
  }, []);

  const onSubmit = async (values) => {
    setServerError("");
    try {
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: regStatus.adminExists ? role : "admin",
        eventIds: role === "team_member" ? selectedEventIds : [],
      };

      await authAPI.register(payload);
      toast.success(
        payload.role === "admin" ? "Admin account created." : "Team member account created."
      );

      // Initial admin setup -> redirect to admin dashboard
      if (!regStatus.adminExists) {
        router.replace("/admin");
        return;
      }

      setCreatedUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: payload.role,
        eventCount: payload.eventIds.length,
      });
      reset();
      setSelectedEventIds([]);
    } catch (err) {
      setServerError(err.message || "Couldn't create account. Try a different email.");
    }
  };

  if (regStatus.loading || status === "loading") {
    return (
      <div className="py-12 text-center font-mono text-xs text-clay">
        Checking system access permissions…
      </div>
    );
  }

  // Registration Wall: If user is not logged in as Admin and Admin accounts exist
  const isAuthorizedAdmin = user?.role === "admin" || regStatus.isAdmin;
  if (!isAuthorizedAdmin && regStatus.adminExists) {
    return (
      <div className="rounded-[var(--radius-proof)] border border-safelight/40 bg-safelight-tint/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-safelight/40 bg-safelight-tint/20 text-2xl">
          🔒
        </div>
        <h1 className="font-display text-2xl">Admin Authorization Required</h1>
        <p className="mt-2 text-sm text-clay leading-relaxed">
          To create a new <strong>Admin</strong> or <strong>Team Member</strong> account, an existing Admin must first log in. Public registration is restricted.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button as={Link} href="/login" className="px-6">
            Log in as Admin
          </Button>
        </div>
        <p className="mt-6 text-xs text-clay-dim">
          Already have credentials? Log in with your Admin account to access account creation.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">
          {isAuthorizedAdmin ? "Create New Account" : "Register as Admin"}
        </h1>
        {isAuthorizedAdmin && (
          <span className="rounded-full border border-safelight/40 bg-safelight-tint/20 px-3 py-1 font-mono text-[11px] text-safelight">
            Logged in as Admin
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-clay">
        {isAuthorizedAdmin
          ? "Create a new Admin or Team Member account with their respective permissions."
          : "Initial studio setup: Create the primary admin account for your studio."}
      </p>

      {createdUser ? (
        <div className="mt-6 space-y-4 rounded-[var(--radius-proof)] border border-line bg-paper-dim p-5">
          <div className="flex items-center gap-2 text-safelight font-medium text-sm">
            <span>✓</span> Account created successfully
          </div>

          <div className="rounded-[var(--radius-proof)] border border-paper-line bg-paper p-4 font-mono text-sm space-y-1">
            <p><strong>Role:</strong> {createdUser.role === "admin" ? "Admin" : "Team Member"}</p>
            <p><strong>Name:</strong> {createdUser.name}</p>
            <p><strong>Email:</strong> {createdUser.email}</p>
            <p><strong>Password:</strong> <span className="text-safelight">{createdUser.password}</span></p>
            {createdUser.role === "team_member" && (
              <p className="text-xs text-clay mt-1">Assigned to {createdUser.eventCount} event(s)</p>
            )}
          </div>

          <p className="text-xs text-clay">
            Share these credentials with the user. The password won&apos;t be displayed again.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="secondary-paper"
              onClick={() =>
                navigator.clipboard
                  .writeText(`${createdUser.email} / ${createdUser.password}`)
                  .then(() => toast.show("Credentials copied."))
              }
            >
              Copy Credentials
            </Button>
            <Button type="button" onClick={() => setCreatedUser(null)}>
              Create Another Account
            </Button>
            <Button type="button" variant="secondary-paper" onClick={() => router.push("/admin")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {isAuthorizedAdmin && (
            <div>
              <label className="mb-1.5 block font-mono text-xs font-medium text-clay">
                ACCOUNT ROLE &amp; PERMISSIONS
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`rounded-[var(--radius-proof)] border px-4 py-2.5 text-xs font-mono transition-colors ${
                    role === "admin"
                      ? "border-safelight bg-safelight-tint/20 text-safelight font-semibold"
                      : "border-paper-line bg-paper-dim text-clay hover:border-clay"
                  }`}
                >
                  🔑 Admin Account
                </button>
                <button
                  type="button"
                  onClick={() => setRole("team_member")}
                  className={`rounded-[var(--radius-proof)] border px-4 py-2.5 text-xs font-mono transition-colors ${
                    role === "team_member"
                      ? "border-safelight bg-safelight-tint/20 text-safelight font-semibold"
                      : "border-paper-line bg-paper-dim text-clay hover:border-clay"
                  }`}
                >
                  📷 Team Member
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-clay-dim">
                {role === "admin"
                  ? "Admins can create events, manage team members, review & select photos, and publish galleries."
                  : "Team members can only view assigned events, view event photos, and upload new photos."}
              </p>
            </div>
          )}

          <Field label="Name" tone="paper" error={errors.name && "Enter name."}>
            <input
              {...register("name", { required: true })}
              className={inputClass("paper", !!errors.name)}
              placeholder="e.g. Rahul Verma"
            />
          </Field>

          <Field label="Email" tone="paper" error={errors.email && "Enter valid email."}>
            <input
              type="email"
              {...register("email", { required: true })}
              className={inputClass("paper", !!errors.email)}
              placeholder="rahul@studio.com"
            />
          </Field>

          <Field label="Password" tone="paper" error={errors.password && "Use at least 8 characters."}>
            <div className="flex gap-2">
              <input
                {...register("password", { required: true, minLength: 8 })}
                className={inputClass("paper", !!errors.password)}
                placeholder="Set password"
              />
              {isAuthorizedAdmin && (
                <Button
                  type="button"
                  variant="secondary-paper"
                  onClick={() => setValue("password", randomPassword(), { shouldValidate: true })}
                >
                  Generate
                </Button>
              )}
            </div>
          </Field>

          {isAuthorizedAdmin && role === "team_member" && events.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block font-mono text-xs font-medium text-clay">
                ASSIGN TO EXISTING EVENTS (OPTIONAL)
              </label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-[var(--radius-proof)] border border-paper-line bg-paper-dim p-3">
                {events.map((evt) => {
                  const id = idOf(evt);
                  const isChecked = selectedEventIds.includes(id);
                  return (
                    <label key={id} className="flex items-center gap-2.5 text-xs text-plate cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEventIds([...selectedEventIds, id]);
                          else setSelectedEventIds(selectedEventIds.filter((item) => item !== id));
                        }}
                        className="accent-safelight h-4 w-4"
                      />
                      <span>{evt.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {serverError && <p className="text-sm text-safelight">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? "Creating account…"
              : isAuthorizedAdmin
              ? role === "admin"
                ? "Create Admin Account"
                : "Create Team Member Account"
              : "Create Initial Admin Account"}
          </Button>
        </form>
      )}

      {!isAuthorizedAdmin && (
        <p className="mt-6 text-sm text-clay">
          Already have an account?{" "}
          <Link href="/login" className="text-safelight hover:underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
