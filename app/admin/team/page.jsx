"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { teamMembersAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import Button from "@/components/Button";
import Field, { inputClass } from "@/components/Field";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Topbar from "@/components/Topbar";

function randomPassword() {
  return Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
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
      <Topbar eyebrow="STUDIO CONSOLE" title="Team">
        <Button onClick={() => setModalOpen(true)}>+ Add team member</Button>
      </Topbar>

      <div className="px-8 py-7">
        <p className="mb-5 text-sm text-ash">
          People you&apos;ve added who can upload photos to the events they&apos;re assigned to.
        </p>

        {members === null && (
          <div className="flex justify-center py-16">
            <Loader label="Loading team" />
          </div>
        )}
        {members?.length === 0 && (
          <EmptyState
            title="No team members yet"
            description="Add someone to upload photos on your behalf, then assign them to an event."
            action={<Button onClick={() => setModalOpen(true)}>Add team member</Button>}
          />
        )}
        {members && members.length > 0 && (
          <div className="overflow-hidden rounded-[var(--radius-proof)] border border-line bg-ink-soft">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-line px-3.5 pb-2.5 pt-3.5 text-left font-mono text-[10.5px] tracking-wide text-ash-dim">
                    NAME
                  </th>
                  <th className="border-b border-line px-3.5 pb-2.5 pt-3.5 text-left font-mono text-[10.5px] tracking-wide text-ash-dim">
                    EMAIL
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={idOf(member)} className="transition-colors hover:bg-ink-raised">
                    <td className="border-b border-line-soft px-3.5 py-3 text-[13px] font-medium last:border-b-0">
                      <div className="flex items-center gap-3">
                        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-line bg-ink-raised font-mono text-[11.5px] text-bone">
                          {member.name
                            ?.split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("")}
                        </span>
                        {member.name}
                      </div>
                    </td>
                    <td className="border-b border-line-soft px-3.5 py-3 text-[13px] text-ash last:border-b-0">
                      {member.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const [created, setCreated] = useState(null); // holds { name, email, password } after success
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const close = () => {
    reset();
    setCreated(null);
    onClose();
  };

  const onSubmit = async (values) => {
    const member = await teamMembersAPI.create(values);
    onCreated(member);
    toast.success(`${values.name} added to your team.`);
    setCreated({ name: values.name, email: values.email, password: values.password });
  };

  return (
    <Modal open={open} onClose={close} title={created ? "Team member added" : "Add team member"}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-ash">
            Share these sign-in details with {created.name} — this password won&apos;t be shown again.
          </p>
          <div className="rounded-[var(--radius-proof)] border border-line bg-ink-soft p-4 font-mono text-sm">
            <p>{created.email}</p>
            <p className="mt-1 text-safelight">{created.password}</p>
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
          <Field label="Name" error={errors.name && "Enter a name."}>
            <input
              autoFocus
              {...register("name", { required: true })}
              className={inputClass("ink", !!errors.name)}
              placeholder="Rohan Mehta"
            />
          </Field>
          <Field label="Email" error={errors.email && "Enter a valid email."}>
            <input
              type="email"
              {...register("email", { required: true })}
              className={inputClass("ink", !!errors.email)}
              placeholder="rohan@studio.com"
            />
          </Field>
          <Field label="Password" error={errors.password && "Use at least 8 characters."}>
            <div className="flex gap-2">
              <input
                {...register("password", { required: true, minLength: 8 })}
                className={inputClass("ink", !!errors.password)}
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
              {isSubmitting ? "Adding…" : "Add team member"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
