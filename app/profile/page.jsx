"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Camera, Key, Loader2, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import { profileAPI } from "@/lib/api";
import Button from "@/components/Button";
import Field, { inputClass } from "@/components/Field";
import Loader from "@/components/Loader";
import Topbar from "@/components/Topbar";
import { Card } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

// Shared by both roles — the layout each role normally gets (AdminLayout /
// TeamLayout) enforces a specific role and redirects the other away, so this
// page does its own lightweight auth check instead of living under either.
// The backend route it calls (/api/auth/profile) is already scoped to
// "whoever is authenticated", so no role branching is needed here either.
export default function ProfilePage() {
  const { user, status, refresh, setProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login");
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader label="Loading profile" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="min-w-0 flex-1">
        <Topbar eyebrow={user.role === "admin" ? "Studio console" : "Team workspace"} title="Your profile" />
        <div className="mx-auto max-w-2xl space-y-6 px-5 py-7 sm:px-8">
          <AvatarCard user={user} onUpdated={(patch) => setProfile(patch)} />
          <DetailsCard user={user} onUpdated={(patch) => setProfile(patch)} onSaved={refresh} />
          <PasswordCard />
        </div>
      </main>
    </SidebarProvider>
  );
}

function AvatarCard({ user, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const toast = useToast();

  const pickFile = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const data = await profileAPI.uploadAvatar(file);
      onUpdated(data);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err.message || "Couldn't update the photo.");
    } finally {
      setBusy(false);
    }
  };

  const removeAvatar = async () => {
    setBusy(true);
    try {
      const data = await profileAPI.removeAvatar();
      onUpdated(data);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err.message || "Couldn't remove the photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-lg font-medium">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated route, not a static asset
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials(user.name)
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {user.role === "admin" ? <Key className="size-3" /> : <Camera className="size-3" />}
            {user.role === "admin" ? "Admin" : "Team member"}
          </span>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={pickFile} disabled={busy}>
            <Upload className="size-3.5" /> Change
          </Button>
          {user.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-xs text-muted-foreground"
              onClick={removeAvatar}
              disabled={busy}
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
      <p className="mt-3 text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. Up to 20 MB.</p>
    </Card>
  );
}

function DetailsCard({ user, onUpdated, onSaved }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: { name: user.name, email: user.email, phone: user.phone || "", bio: user.bio || "" },
  });

  const onSubmit = async (values) => {
    try {
      const data = await profileAPI.update(values);
      onUpdated(data);
      await onSaved();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.message || "Couldn't update your profile.");
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold">Profile details</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name" error={errors.name && "Enter a name."}>
          <input {...register("name", { required: true })} className={inputClass(null, !!errors.name)} />
        </Field>
        <Field label="Email" error={errors.email && "Enter a valid email."}>
          <input
            type="email"
            {...register("email", { required: true })}
            className={inputClass(null, !!errors.email)}
          />
        </Field>
        <Field label="Phone" error={errors.phone && "That's too long for a phone number."}>
          <input
            {...register("phone", { maxLength: 32 })}
            className={inputClass(null, !!errors.phone)}
            placeholder="Optional"
          />
        </Field>
        <Field label="Bio" error={errors.bio && "Keep it under 280 characters."}>
          <textarea
            {...register("bio", { maxLength: 280 })}
            className={inputClass(null, !!errors.bio) + " h-20 resize-none py-2"}
            placeholder="A short line about you (optional)"
          />
        </Field>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      await profileAPI.update({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success("Password changed.");
      reset();
    } catch (err) {
      toast.error(err.message || "Couldn't change your password.");
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold">Change password</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Current password" error={errors.currentPassword && "Enter your current password."}>
          <input
            type="password"
            {...register("currentPassword", { required: true })}
            className={inputClass(null, !!errors.currentPassword)}
          />
        </Field>
        <Field label="New password" error={errors.newPassword && "Use at least 8 characters."}>
          <input
            type="password"
            {...register("newPassword", { required: true, minLength: 8 })}
            className={inputClass(null, !!errors.newPassword)}
          />
        </Field>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
