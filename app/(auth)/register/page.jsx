"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Lock, Key, Camera, Check } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { authAPI, eventsAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import Field, { inputClass } from "@/components/Field";
import Button from "@/components/Button";
import { Card, CardContent } from "@/components/ui/card";

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
      <div className="py-12 text-center text-xs text-muted-foreground">
        Checking system access permissions…
      </div>
    );
  }

  // Registration Wall: If user is not logged in as Admin and Admin accounts exist
  const isAuthorizedAdmin = user?.role === "admin" || regStatus.isAdmin;
  if (!isAuthorizedAdmin && regStatus.adminExists) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <Lock className="size-5" />
          </div>
          <h1 className="text-xl font-semibold">Admin authorization required</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            To create a new <strong>Admin</strong> or <strong>Team Member</strong> account, an existing Admin must first log in. Public registration is restricted.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button as={Link} href="/login" className="px-6">
              Log in as Admin
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Already have credentials? Log in with your Admin account to access account creation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAuthorizedAdmin ? "Create new account" : "Register as admin"}
        </h1>
        {isAuthorizedAdmin && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            Logged in as Admin
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {isAuthorizedAdmin
          ? "Create a new Admin or Team Member account with their respective permissions."
          : "Initial studio setup: create the primary admin account for your studio."}
      </p>

      {createdUser ? (
        <Card className="mt-6">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <Check className="size-4" /> Account created successfully
            </div>

            <div className="space-y-1 rounded-lg border border-border bg-muted/50 p-4 text-sm">
              <p><strong>Role:</strong> {createdUser.role === "admin" ? "Admin" : "Team Member"}</p>
              <p><strong>Name:</strong> {createdUser.name}</p>
              <p><strong>Email:</strong> {createdUser.email}</p>
              <p><strong>Password:</strong> <span className="text-primary">{createdUser.password}</span></p>
              {createdUser.role === "team_member" && (
                <p className="mt-1 text-xs text-muted-foreground">Assigned to {createdUser.eventCount} event(s)</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Share these credentials with the user. The password won&apos;t be displayed again.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(`${createdUser.email} / ${createdUser.password}`)
                    .then(() => toast.show("Credentials copied."))
                }
              >
                Copy credentials
              </Button>
              <Button type="button" onClick={() => setCreatedUser(null)}>
                Create another account
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/admin")}>
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {isAuthorizedAdmin && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Account role &amp; permissions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                    role === "admin"
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <Key className="size-3.5" /> Admin account
                </button>
                <button
                  type="button"
                  onClick={() => setRole("team_member")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                    role === "team_member"
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <Camera className="size-3.5" /> Team member
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {role === "admin"
                  ? "Admins can create events, manage team members, review & select photos, and publish galleries."
                  : "Team members can only view assigned events, view event photos, and upload new photos."}
              </p>
            </div>
          )}

          <Field label="Name" error={errors.name && "Enter name."}>
            <input
              {...register("name", { required: true })}
              className={inputClass(null, !!errors.name)}
              placeholder="e.g. Rahul Verma"
            />
          </Field>

          <Field label="Email" error={errors.email && "Enter valid email."}>
            <input
              type="email"
              {...register("email", { required: true })}
              className={inputClass(null, !!errors.email)}
              placeholder="rahul@studio.com"
            />
          </Field>

          <Field label="Password" error={errors.password && "Use at least 8 characters."}>
            <div className="flex gap-2">
              <input
                {...register("password", { required: true, minLength: 8 })}
                className={inputClass(null, !!errors.password)}
                placeholder="Set password"
              />
              {isAuthorizedAdmin && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setValue("password", randomPassword(), { shouldValidate: true })}
                >
                  Generate
                </Button>
              )}
            </div>
          </Field>

          {isAuthorizedAdmin && role === "team_member" && events.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Assign to existing events (optional)
              </label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/50 p-3">
                {events.map((evt) => {
                  const id = idOf(evt);
                  const isChecked = selectedEventIds.includes(id);
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEventIds([...selectedEventIds, id]);
                          else setSelectedEventIds(selectedEventIds.filter((item) => item !== id));
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      <span>{evt.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? "Creating account…"
              : isAuthorizedAdmin
              ? role === "admin"
                ? "Create admin account"
                : "Create team member account"
              : "Create initial admin account"}
          </Button>
        </form>
      )}

      {!isAuthorizedAdmin && (
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
