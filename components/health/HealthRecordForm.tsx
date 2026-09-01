"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createHealthRecordAction, type HealthRecordFormInput } from "@/lib/actions/health";
import type { HealthRecord } from "@/types/farm";

const EVENT_TYPES: HealthRecord["eventType"][] = [
  "vaccination",
  "treatment",
  "deworming",
  "checkup",
  "injury",
  "illness",
];

const FIELD =
  "w-full text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500";
const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

interface HealthRecordFormProps {
  animalId: string;
  animalType: HealthRecord["animalType"];
}

/**
 * Shared across cattle/sheep/poultry detail pages — this is the FIRST
 * creation path health_records has ever had in this app (confirmed by
 * grep: only getHealthRecords() existed in lib/data/health.ts before
 * this, no create anywhere). Collapsed behind a button by default, same
 * pattern as CalvingForm — this is occasional clinical data entry, not
 * routine daily logging.
 *
 * Calls createHealthRecordAction directly with a typed object (not
 * FormData/useActionState) since that action already takes a structured
 * HealthRecordFormInput — same calling convention already used by
 * SheepEventsView/CropsLogView for their own structured-input actions.
 *
 * Quarantine fields (withdrawalDaysMilk/withdrawalDaysMeat/
 * quarantineUntilDate — the Phase 2.1 fields types/farm.ts calls the
 * single source of truth for "is this animal quarantined") are exposed
 * under a collapsed "Advanced" toggle, since most entries (a routine
 * deworming, a checkup) won't need them. The older, separate
 * `withdrawalPeriodEndsOn` field on HealthRecord is deliberately NOT
 * exposed here — it predates and appears superseded by the quarantine
 * fields per that type's own comment, so this form doesn't add a second
 * way to populate an overlapping concept.
 */
export function HealthRecordForm({ animalId, animalType }: HealthRecordFormProps) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [eventType, setEventType] = useState<HealthRecord["eventType"]>("treatment");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [diagnosis, setDiagnosis] = useState("");
  const [medicineUsed, setMedicineUsed] = useState("");
  const [dosage, setDosage] = useState("");
  const [administeredBy, setAdministeredBy] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [withdrawalDaysMilk, setWithdrawalDaysMilk] = useState("");
  const [withdrawalDaysMeat, setWithdrawalDaysMeat] = useState("");
  const [quarantineUntilDate, setQuarantineUntilDate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Log health record
      </Button>
    );
  }

  function reset() {
    setEventType("treatment");
    setDate(new Date().toISOString().slice(0, 10));
    setDiagnosis("");
    setMedicineUsed("");
    setDosage("");
    setAdministeredBy("");
    setCostAmount("");
    setFollowUpDate("");
    setNotes("");
    setWithdrawalDaysMilk("");
    setWithdrawalDaysMeat("");
    setQuarantineUntilDate("");
    setAdvancedOpen(false);
  }

  function submit() {
    setError(null);

    const costParsed = costAmount.trim() ? parseFloat(costAmount) : undefined;
    if (costParsed !== undefined && (!Number.isFinite(costParsed) || costParsed < 0)) {
      setError("Enter a valid, non-negative cost, or leave it blank.");
      return;
    }

    const input: HealthRecordFormInput = {
      animalId,
      animalType,
      eventType,
      date,
      diagnosis: diagnosis.trim() || undefined,
      medicineUsed: medicineUsed.trim() || undefined,
      dosage: dosage.trim() || undefined,
      administeredBy: administeredBy.trim() || undefined,
      followUpDate: followUpDate || undefined,
      notes: notes.trim() || undefined,
      withdrawalDaysMilk: withdrawalDaysMilk.trim() ? parseFloat(withdrawalDaysMilk) : undefined,
      withdrawalDaysMeat: withdrawalDaysMeat.trim() ? parseFloat(withdrawalDaysMeat) : undefined,
      quarantineUntilDate: quarantineUntilDate || undefined,
      costAmount: costParsed,
    };

    startTransition(async () => {
      const result = await createHealthRecordAction(input);
      if (result.ok) {
        reset();
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="border border-line rounded p-5 bg-parchment-100/40 max-w-2xl">
      <h3 className="font-display text-base text-ink-900 mb-4">Log health record</h3>
      {error && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded px-3 py-2 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={LABEL} htmlFor="hr-eventType">
            Event type
          </label>
          <select
            id="hr-eventType"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as HealthRecord["eventType"])}
            className={FIELD}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="hr-date">
            Date
          </label>
          <input id="hr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
        </div>
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="hr-diagnosis">
          Diagnosis / reason (optional)
        </label>
        <input
          id="hr-diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="e.g. Suspected mastitis"
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={LABEL} htmlFor="hr-medicine">
            Medicine used (optional)
          </label>
          <input id="hr-medicine" value={medicineUsed} onChange={(e) => setMedicineUsed(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="hr-dosage">
            Dosage (optional)
          </label>
          <input id="hr-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={LABEL} htmlFor="hr-administeredBy">
            Administered by (optional)
          </label>
          <input
            id="hr-administeredBy"
            value={administeredBy}
            onChange={(e) => setAdministeredBy(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="hr-cost">
            Cost, KES (optional)
          </label>
          <input
            id="hr-cost"
            type="number"
            min="0"
            step="0.01"
            value={costAmount}
            onChange={(e) => setCostAmount(e.target.value)}
            placeholder="e.g. 1200"
            className={FIELD}
          />
        </div>
      </div>
      {costAmount.trim() && (
        <p className="text-xs text-ink-500 -mt-2 mb-4">
          Entering a cost also records this as an expense under Financials.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={LABEL} htmlFor="hr-followUp">
            Follow-up date (optional)
          </label>
          <input
            id="hr-followUp"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="hr-notes">
          Notes (optional)
        </label>
        <textarea id="hr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} />
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="text-[11px] text-ink-500 hover:text-ink-900 mb-4"
      >
        {advancedOpen ? "− Hide withdrawal / quarantine details" : "+ Add withdrawal / quarantine details"}
      </button>

      {advancedOpen && (
        <div className="border-t border-line pt-4 mb-4">
          <p className="text-xs text-ink-500 mb-3">
            Setting a quarantine date marks this animal/flock as non-sellable until that date — shown as a
            quarantine badge elsewhere in the app.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={LABEL} htmlFor="hr-withdrawalMilk">
                Milk withdrawal (days)
              </label>
              <input
                id="hr-withdrawalMilk"
                type="number"
                min="0"
                value={withdrawalDaysMilk}
                onChange={(e) => setWithdrawalDaysMilk(e.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="hr-withdrawalMeat">
                Meat withdrawal (days)
              </label>
              <input
                id="hr-withdrawalMeat"
                type="number"
                min="0"
                value={withdrawalDaysMeat}
                onChange={(e) => setWithdrawalDaysMeat(e.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="hr-quarantineUntil">
                Quarantined until
              </label>
              <input
                id="hr-quarantineUntil"
                type="date"
                value={quarantineUntilDate}
                onChange={(e) => setQuarantineUntilDate(e.target.value)}
                className={FIELD}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save health record"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
