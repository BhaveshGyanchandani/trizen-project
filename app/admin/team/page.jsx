"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Key, Camera } from "lucide-react";
import { teamMembersAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import Button from "@/components/Button";
import Field, { inputClass } from "@/components/Field";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Topbar from "@/components/Topbar";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function randomPassword() {
  return Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
}

function initials(name = "") {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function TeamPage() {
  const [members, setMembers] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      const data = await teamMembersAPI.list();
      setMembers(Array.isArray(data) ? data : data?.teamMembers || []);
    } catch (err) {
      toast.error(err.message || "Couldn't load team members.");
      setMembers([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Topbar eyebrow="Studio console" title="Team & accounts">
        <Button onClick={() => setModalOpen(true)}>+ Add team member / admin</Button>
      </Topbar>

      <div className="px-5 py-7 sm:px-8">
        <p className="mb-5 text-sm text-muted-foreground">
          People in your studio. Team members can upload photos to assigned events; admins have full management access.
        </p>

        {members === null && (
          <div className="flex justify-center py-16">
            <Loader label="Loading accounts" />
          </div>
        )}
        {members?.length === 0 && (
          <EmptyState
            title="No accounts added yet"
            description="Add a team member or admin to manage events and upload photos."
            action={<Button onClick={() => setModalOpen(true)}>Add team member / admin</Button>}
          />
        )}
        {members && members.length > 0 && (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={idOf(member)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-medium">
                          {initials(member.name)}
                        </span>
                        {member.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${
                          member.role === "admin"
                            ? "border border-primary/30 bg-primary/10 text-primary"
                            : "border border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {member.role === "admin" ? <Key className="size-3" /> : <Camera className="size-3" />}
                        {member.role === "admin" ? "Admin" : "Team member"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <AddTeamMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(member) => {
          setMembers((prev) => [member, ...(prev || [])]);
        }}
      />
    </div>
  );
}

function AddTeamMemberModal({ open, onClose, onCreated }) {
  const [created, setCreated] = useState(null); // holds { name, email, password, role } after success
  const [role, setRole] = useState("team_member");
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const close = () => {
    reset();
    setCreated(null);
    setRole("team_member");
    onClose();
  };

  const onSubmit = async (values) => {
    const member = await teamMembersAPI.create({ ...values, role });
    onCreated(member);
    toast.success(`${values.name} created as ${role === "admin" ? "Admin" : "Team member"}.`);
    setCreated({ name: values.name, email: values.email, password: values.password, role });
  };

  return (
    <Modal open={open} onClose={close} title={created ? "Account created" : "Add team member or admin"}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share these sign-in details with {created.name} — this password won&apos;t be shown again.
          </p>
          <div className="space-y-1 rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <p><strong>Role:</strong> {created.role === "admin" ? "Admin" : "Team Member"}</p>
            <p>{created.email}</p>
            <p className="mt-1 text-primary">{created.password}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(`${created.email} / ${created.password}`)
                .then(() => toast.show("Copied to clipboard."))
            }
          >
            Copy details
          </Button>
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Account role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("team_member")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  role === "team_member"
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <Camera className="size-3.5" /> Team member
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  role === "admin"
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <Key className="size-3.5" /> Admin
              </button>
            </div>
          </div>

          <Field label="Name" error={errors.name && "Enter a name."}>
            <input
              autoFocus
              {...register("name", { required: true })}
              className={inputClass(null, !!errors.name)}
              placeholder="Rohan Mehta"
            />
          </Field>
          <Field label="Email" error={errors.email && "Enter a valid email."}>
            <input
              type="email"
              {...register("email", { required: true })}
              className={inputClass(null, !!errors.email)}
              placeholder="rohan@studio.com"
            />
          </Field>
          <Field label="Password" error={errors.password && "Use at least 8 characters."}>
            <div className="flex gap-2">
              <input
                {...register("password", { required: true, minLength: 8 })}
                className={inputClass(null, !!errors.password)}
                placeholder="Set an initial password"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setValue("password", randomPassword(), { shouldValidate: true })}
              >
                Generate
              </Button>
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : `Create ${role === "admin" ? "Admin" : "Team Member"}`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
