"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const RELATIONSHIPS = [
  { id: "self", label: "Self" },
  { id: "spouse", label: "Spouse / Partner" },
  { id: "child", label: "Child" },
  { id: "parent", label: "Parent" },
  { id: "sibling", label: "Sibling" },
  { id: "friend", label: "Friend" },
  { id: "other", label: "Other" },
];

const SEAT_PREFS = [
  { id: "window", label: "Window" },
  { id: "aisle", label: "Aisle" },
  { id: "no_preference", label: "No preference" },
];

const MEAL_PREFS = [
  { id: "standard", label: "Standard" },
  { id: "halal", label: "Halal" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "kosher", label: "Kosher" },
];

type FormState = {
  full_name: string;
  relationship: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
  passport_country: string;
  seat_preference: string;
  meal_preference: string;
  known_traveler_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

export default function EditTravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data, error: fetchErr } = await supabase
        .from("traveler_profiles")
        .select("*")
        .eq("id", id)
        .eq("owner_id", session.user.id)
        .single();

      if (fetchErr || !data) { router.replace("/group"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      setForm({
        full_name: d.full_name ?? "",
        relationship: d.relationship ?? "other",
        date_of_birth: d.date_of_birth ?? "",
        nationality: d.nationality ?? "",
        passport_number: d.passport_number ?? "",
        passport_expiry: d.passport_expiry ?? "",
        passport_country: d.passport_country ?? "",
        seat_preference: d.seat_preference ?? "no_preference",
        meal_preference: d.meal_preference ?? "standard",
        known_traveler_number: d.known_traveler_number ?? "",
        emergency_contact_name: d.emergency_contact_name ?? "",
        emergency_contact_phone: d.emergency_contact_phone ?? "",
      });
      setLoading(false);
    }
    load();
  }, [id, router]);

  function set(field: keyof FormState, value: string) {
    setForm((f) => f ? { ...f, [field]: value } : f);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form?.full_name.trim()) return;
    setSaving(true);
    setError("");

    const { error: saveErr } = await supabase
      .from("traveler_profiles")
      .update({
        full_name: form.full_name.trim(),
        relationship: form.relationship,
        date_of_birth: form.date_of_birth || null,
        nationality: form.nationality.trim() || null,
        passport_number: form.passport_number.trim() || null,
        passport_expiry: form.passport_expiry || null,
        passport_country: form.passport_country.trim() || null,
        seat_preference: form.seat_preference,
        meal_preference: form.meal_preference,
        known_traveler_number: form.known_traveler_number.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      })
      .eq("id", id);

    if (saveErr) {
      setError(saveErr.message);
      setSaving(false);
      return;
    }

    router.push("/group");
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("traveler_profiles").delete().eq("id", id);
    router.push("/group");
  }

  if (loading || !form) {
    return (
      <main className="flex items-center justify-center min-h-dvh" style={{ background: "var(--sand)" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }} />
      </main>
    );
  }

  return (
    <main className="relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
        <Link
          href="/group"
          className="self-start flex items-center gap-1.5 text-sm"
          style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          My Travelers
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
            Edit Traveler
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            {form.full_name || "Traveler profile"}
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(196,105,90,0.1)", color: "var(--rose)", border: "1px solid rgba(196,105,90,0.2)", fontFamily: "var(--font-dm-sans)" }}>
              {error}
            </div>
          )}

          <FormSection title="Personal Details">
            <Field label="Full legal name" required>
              <TextInput value={form.full_name} onChange={(v) => set("full_name", v)} placeholder="As shown on passport" required />
            </Field>
            <Field label="Relationship">
              <SelectInput value={form.relationship} onChange={(v) => set("relationship", v)} options={RELATIONSHIPS} />
            </Field>
            <Field label="Date of birth" hint="Optional">
              <TextInput type="date" value={form.date_of_birth} onChange={(v) => set("date_of_birth", v)} />
            </Field>
            <Field label="Nationality" hint="Optional">
              <TextInput value={form.nationality} onChange={(v) => set("nationality", v)} placeholder="e.g. British, Canadian" />
            </Field>
          </FormSection>

          <FormSection title="Passport">
            <Field label="Passport number" hint="Optional">
              <TextInput value={form.passport_number} onChange={(v) => set("passport_number", v)} placeholder="e.g. AB1234567" />
            </Field>
            <Field label="Passport expiry" hint="Optional">
              <TextInput type="date" value={form.passport_expiry} onChange={(v) => set("passport_expiry", v)} />
            </Field>
            <Field label="Issuing country" hint="Optional">
              <TextInput value={form.passport_country} onChange={(v) => set("passport_country", v)} placeholder="e.g. United Kingdom" />
            </Field>
          </FormSection>

          <FormSection title="Travel Preferences">
            <Field label="Seat preference">
              <PillSelect value={form.seat_preference} onChange={(v) => set("seat_preference", v)} options={SEAT_PREFS} />
            </Field>
            <Field label="Meal preference">
              <PillSelect value={form.meal_preference} onChange={(v) => set("meal_preference", v)} options={MEAL_PREFS} />
            </Field>
          </FormSection>

          <FormSection title="Optional Details">
            <Field label="Known Traveler Number" hint="TSA PreCheck / Global Entry">
              <TextInput value={form.known_traveler_number} onChange={(v) => set("known_traveler_number", v)} placeholder="e.g. 12345678901" />
            </Field>
            <Field label="Emergency contact name">
              <TextInput value={form.emergency_contact_name} onChange={(v) => set("emergency_contact_name", v)} placeholder="Full name" />
            </Field>
            <Field label="Emergency contact phone">
              <TextInput type="tel" value={form.emergency_contact_phone} onChange={(v) => set("emergency_contact_phone", v)} placeholder="+1 555 000 0000" />
            </Field>
          </FormSection>

          <button
            type="submit"
            disabled={saving || !form.full_name.trim()}
            className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: saving || !form.full_name.trim() ? "var(--border)" : "var(--burnt-orange)",
              color: saving || !form.full_name.trim() ? "var(--ink-muted)" : "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: saving || !form.full_name.trim() ? "none" : "0 4px 16px rgba(184,92,26,0.24)",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>

        {/* Delete section */}
        {confirmDelete ? (
          <div
            className="flex flex-col gap-3 p-4 rounded-2xl"
            style={{ background: "var(--cream)", border: "1.5px solid rgba(196,105,90,0.3)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
              Delete &ldquo;{form.full_name}&rdquo;?
            </p>
            <p className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: "var(--sand)", color: "var(--ink-muted)", border: "1.5px solid var(--border)", fontFamily: "var(--font-dm-sans)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: "var(--rose)", color: "var(--cream)", fontFamily: "var(--font-dm-sans)" }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="self-center text-xs underline underline-offset-2"
            style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}
          >
            Delete traveler
          </button>
        )}
      </div>
    </main>
  );
}

// ─── Shared form primitives ────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl" style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
        {label}
        {hint && <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>· {hint}</span>}
        {required && <span style={{ color: "var(--rose)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
      style={{ background: "var(--sand)", border: "1.5px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
      onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { id: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none"
      style={{ background: "var(--sand)", border: "1.5px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
      onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    >
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

function PillSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.96]"
          style={{
            background: value === o.id ? "var(--teal)" : "var(--sand)",
            color: value === o.id ? "var(--cream)" : "var(--ink-muted)",
            border: `1.5px solid ${value === o.id ? "var(--teal)" : "var(--border)"}`,
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
