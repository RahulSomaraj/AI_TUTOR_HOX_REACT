import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Search, Wallet } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Breadcrumb from "../../components/ui/Breadcrumb";
import DataTable from "../../components/ui/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import SchoolScopeSelect from "../../components/Finance/SchoolScopeSelect";
import MoneyInput from "../../components/Finance/MoneyInput";
import StepIndicator from "../../components/Finance/StepIndicator";
import ReceiptView from "../../components/Finance/ReceiptView";
import PaymentMethodFields from "../../components/Finance/PaymentMethodFields";
import { METHOD_LABELS, isReferenceSatisfied } from "../../components/Finance/paymentMethods";
import useDebounce from "../../hooks/useDebounce";
import { fetchAllStudents } from "../../api/services/students";
import { fetchClasses } from "../../api/services/grades";
import { extractList, safeId } from "../../api/normalize";
import { formatINR } from "../../lib/currency";
import { apiErrorMessage } from "../../lib/apiError";
import { isPayableAmount, toPaise } from "../../lib/money";
import {
  buildPaymentPayload,
  findUnchargedFees,
  mapChargeRows,
  suggestPaymentType,
  useCollectPayment,
  useFeeSummaryQuery,
  useGenerateFeeCharges,
  useStudentAssignedFeesQuery,
} from "../../features/finance/useCollection";
import { useLedgerQuery } from "../../features/finance/useLedger";

const STEPS = [
  { key: "student", label: "Student" },
  { key: "dues", label: "Dues" },
  { key: "amount", label: "Amount" },
  { key: "method", label: "Method" },
  { key: "confirm", label: "Confirm" },
];

// INSTALLMENT is deliberately omitted: the backend treats it as a bare label
// with no schedule or plan resource behind it, so offering it would imply a
// feature that doesn't exist.
const PAYMENT_TYPES = [
  { value: "FULL", label: "Full payment" },
  { value: "PARTIAL", label: "Part payment" },
  { value: "ADVANCE", label: "Advance" },
];

const STUDENT_PAGE_SIZE = 10;

const COLLECTION_UNAVAILABLE =
  "Fee collection isn't available on this server yet — the ledger and payment endpoints returned 404. They're built but not deployed.";

function apiError(err, fallback) {
  return apiErrorMessage(err, fallback, COLLECTION_UNAVAILABLE);
}

function todayIso() {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  return new Date(now.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function gradeLabel(grade) {
  return grade?.aliasName || grade?.divisionName || `Grade ${grade?.id}`;
}

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
      <h2 className="text-[20px] font-semibold text-[#20242a]">{title}</h2>
      {description && <p className="mt-1 text-sm text-[#5b626a]">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function CollectFeePage() {
  const [step, setStep] = useState(0);

  // Step 1 — who is paying
  const [schoolId, setSchoolId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [student, setStudent] = useState(null);

  // Steps 3-4 — what is being paid
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("FULL");
  const [typeTouched, setTypeTouched] = useState(false);
  const [method, setMethod] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [paidAt, setPaidAt] = useState(todayIso);
  const [note, setNote] = useState("");
  const [showReferenceError, setShowReferenceError] = useState(false);

  const [receipt, setReceipt] = useState(null);
  const [actionError, setActionError] = useState("");

  const debouncedSearch = useDebounce(studentSearch, 400);
  const studentId = student?.id ?? "";

  const gradeOptionsQuery = useQuery({
    queryKey: ["grades", "options", schoolId],
    queryFn: async () => {
      const response = await fetchClasses({ schoolId, limit: 50 });
      return extractList(response, ["grades"]);
    },
    enabled: Boolean(schoolId),
  });

  const studentsQuery = useQuery({
    queryKey: ["students", "collect", schoolId, gradeId, debouncedSearch],
    queryFn: async () => {
      const params = { page: 1, limit: STUDENT_PAGE_SIZE, schoolId: Number(schoolId) };
      if (gradeId) params.gradeId = Number(gradeId);
      if (debouncedSearch.trim()) params.name = debouncedSearch.trim();
      const response = await fetchAllStudents(params);
      return extractList(response, ["users", "students"]);
    },
    enabled: Boolean(schoolId),
    placeholderData: (previous) => previous,
  });

  const summaryQuery = useFeeSummaryQuery(studentId);
  const ledgerQuery = useLedgerQuery(studentId);
  const assignedFeesQuery = useStudentAssignedFeesQuery(studentId);

  const collectPayment = useCollectPayment();
  const generateCharges = useGenerateFeeCharges();

  const outstanding = summaryQuery.data?.outstanding ?? 0;
  const amountPaise = toPaise(amount);

  const chargeRows = useMemo(
    () => mapChargeRows(ledgerQuery.data?.entries),
    [ledgerQuery.data?.entries]
  );

  const unchargedFees = useMemo(
    () => findUnchargedFees(assignedFeesQuery.data, ledgerQuery.data?.entries),
    [assignedFeesQuery.data, ledgerQuery.data?.entries]
  );

  // The suggested type follows the amount until the user overrides it — after
  // that their choice sticks, even if they edit the amount again.
  const effectivePaymentType = typeTouched
    ? paymentType
    : suggestPaymentType(amountPaise, outstanding);

  const duesLoading =
    summaryQuery.isPending || ledgerQuery.isPending || assignedFeesQuery.isPending;
  const duesError =
    summaryQuery.isError || ledgerQuery.isError
      ? apiError(summaryQuery.error ?? ledgerQuery.error, "Failed to load the student's dues")
      : "";

  function resetPaymentFields() {
    setAmount("");
    setPaymentType("FULL");
    setTypeTouched(false);
    setMethod("CASH");
    setReferenceNo("");
    setPaidAt(todayIso());
    setNote("");
    setShowReferenceError(false);
    setActionError("");
  }

  function handleSelectStudent(row) {
    setStudent(row);
    resetPaymentFields();
    setStep(1);
  }

  function handleChangeSchool(value) {
    setSchoolId(value);
    setGradeId("");
    setStudent(null);
  }

  async function handleGenerateCharges() {
    setActionError("");
    try {
      await generateCharges.mutateAsync(Number(studentId));
    } catch (err) {
      setActionError(apiError(err, "Failed to post the pending fee charges"));
    }
  }

  function handleContinueFromMethod() {
    if (!isReferenceSatisfied(method, referenceNo)) {
      setShowReferenceError(true);
      return;
    }
    setShowReferenceError(false);
    setStep(4);
  }

  async function handleConfirm() {
    setActionError("");
    try {
      const payload = buildPaymentPayload({
        studentId,
        amountPaise,
        method,
        paymentType: effectivePaymentType,
        referenceNo,
        paidAt,
        note,
      });
      const response = await collectPayment.mutateAsync(payload);
      const body = response?.data ?? {};
      setReceipt({ payment: body.payment ?? null, balance: body.balance ?? "0.00" });
    } catch (err) {
      setActionError(apiError(err, "Failed to record the payment"));
    }
  }

  function handleCollectAnother() {
    setReceipt(null);
    setStudent(null);
    setStudentSearch("");
    resetPaymentFields();
    setStep(0);
  }

  // ── Receipt replaces the wizard once the payment is recorded ──────────────
  if (receipt) {
    return (
      <div className="ty-page-shell">
        <Breadcrumb
          items={[{ label: "Fee Management", path: "/finance" }, { label: "Collect Fee" }]}
        />
        <PageHeader title="Payment Recorded" subtitle={student?.name ?? ""} />
        <ReceiptView
          payment={receipt.payment}
          balance={receipt.balance}
          student={student}
          onCollectAnother={handleCollectAnother}
        />
      </div>
    );
  }

  const studentRows = studentsQuery.data ?? [];

  const studentColumns = [
    {
      key: "name",
      header: "Student",
      render: (row) => <span className="font-medium text-[#2a2d32]">{row?.name ?? "-"}</span>,
    },
    { key: "studentCode", header: "Code", render: (row) => row?.studentCode || "-" },
    { key: "contactEmail", header: "Email", render: (row) => row?.contactEmail || "-" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleSelectStudent(row)}
          className="inline-flex items-center gap-1.5 rounded bg-[#155966] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#104a55]"
        >
          Select
          <ArrowRight size={14} />
        </button>
      ),
    },
  ];

  const chargeColumns = [
    {
      key: "label",
      header: "Charge",
      render: (row) => (
        <div>
          <span className="font-medium text-[#2a2d32]">{row.label}</span>
          {row.count > 1 && (
            <span className="ml-2 text-xs text-[#8b939b]">×{row.count}</span>
          )}
        </div>
      ),
    },
    {
      key: "typeLabel",
      header: "Type",
      render: (row) => (
        <StatusBadge
          label={row.typeLabel}
          tone={row.entryType === "FEE_CHARGE" ? "info" : "warning"}
        />
      ),
    },
    {
      key: "amount",
      header: "Charged",
      align: "right",
      render: (row) => formatINR(row.amount / 100),
    },
  ];

  return (
    <div className="ty-page-shell">
      <Breadcrumb
        items={[{ label: "Fee Management", path: "/finance" }, { label: "Collect Fee" }]}
      />
      <PageHeader
        title="Collect Fee"
        subtitle={student ? `${student.name} · ${student.studentCode ?? "No code"}` : "Record a fee payment against a student's ledger"}
      />

      <StepIndicator
        steps={STEPS}
        current={step}
        onStepClick={(index) => {
          setActionError("");
          setStep(index);
        }}
      />

      {actionError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* ── Step 1 · Student ─────────────────────────────────────────────── */}
      {step === 0 && (
        <SectionCard
          title="Find the student"
          description="Pick a school, then search by name. Narrow by class if the school is large."
        >
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">School *</span>
              <SchoolScopeSelect includeAll={false} value={schoolId} onChange={handleChangeSchool} />
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Class</span>
              <select
                value={gradeId}
                onChange={(event) => setGradeId(event.target.value)}
                disabled={!schoolId || gradeOptionsQuery.isPending}
                className="h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb] disabled:text-[#9aa3aa]"
              >
                <option value="">{schoolId ? "All classes" : "Select a school first"}</option>
                {(gradeOptionsQuery.data ?? []).map((grade) => (
                  <option key={grade.id} value={safeId(grade.id)}>
                    {gradeLabel(grade)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Search</span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3aa]"
                />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  disabled={!schoolId}
                  placeholder="Student name"
                  className="h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white pl-9 pr-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb]"
                />
              </div>
            </div>
          </div>

          {!schoolId ? (
            <div className="py-14 text-center text-sm text-[#5b626a]">
              Select a school to search for students.
            </div>
          ) : (
            <DataTable
              columns={studentColumns}
              rows={studentRows}
              loading={studentsQuery.isPending}
              error={
                studentsQuery.isError ? apiError(studentsQuery.error, "Failed to load students") : ""
              }
              emptyLabel="No students match that search."
              rowKey={(row) => row?.id}
              minWidth={720}
            />
          )}
        </SectionCard>
      )}

      {/* ── Step 2 · Dues ────────────────────────────────────────────────── */}
      {step === 1 && (
        <SectionCard
          title="Outstanding dues"
          description="What this student has been charged, and what they currently owe."
        >
          {duesLoading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#5b626a]">
              <Loader2 size={18} className="animate-spin" />
              Loading dues...
            </div>
          ) : duesError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {duesError}
            </div>
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[14px] bg-[#f4f8f9] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.5px] text-[#5b626a]">Charged</p>
                  <p className="mt-1 text-[20px] font-semibold text-[#20242a]">
                    {formatINR((summaryQuery.data?.totalCharged ?? 0) / 100)}
                  </p>
                </div>
                <div className="rounded-[14px] bg-[#f4f8f9] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.5px] text-[#5b626a]">
                    Paid &amp; adjusted
                  </p>
                  <p className="mt-1 text-[20px] font-semibold text-[#20242a]">
                    {formatINR(
                      ((summaryQuery.data?.totalPaid ?? 0) +
                        (summaryQuery.data?.totalDiscount ?? 0) +
                        (summaryQuery.data?.totalRefund ?? 0)) /
                        100
                    )}
                  </p>
                </div>
                <div
                  className={`rounded-[14px] px-4 py-4 ${outstanding > 0 ? "bg-amber-50" : "bg-emerald-50"}`}
                >
                  <p className="text-xs uppercase tracking-[0.5px] text-[#5b626a]">Outstanding</p>
                  <p
                    className={`mt-1 text-[20px] font-semibold ${outstanding > 0 ? "text-amber-800" : "text-emerald-800"}`}
                  >
                    {formatINR(outstanding / 100)}
                  </p>
                </div>
              </div>

              {unchargedFees.length > 0 && (
                <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        {unchargedFees.length} assigned fee
                        {unchargedFees.length === 1 ? " has" : "s have"} not been charged yet
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        Assigning a fee doesn&apos;t post it to the ledger, so the outstanding
                        figure above excludes{" "}
                        {formatINR(
                          unchargedFees.reduce((total, fee) => total + fee.amount, 0) / 100
                        )}
                        . Post them before collecting, or the student will be charged again later.
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateCharges}
                        disabled={generateCharges.isPending}
                        className="mt-3 inline-flex items-center gap-2 rounded bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
                      >
                        {generateCharges.isPending && <Loader2 size={14} className="animate-spin" />}
                        Post pending fee charges
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <DataTable
                columns={chargeColumns}
                rows={chargeRows}
                emptyLabel="Nothing has been charged to this student yet."
                rowKey={(row) => row.key}
                minWidth={560}
              />

              <p className="mt-4 text-xs text-[#8b939b]">
                Payments settle the student&apos;s overall balance rather than a specific charge,
                so these rows show what was charged — not a per-fee balance.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="inline-flex items-center justify-center gap-2 rounded border border-[#c7cbd1] px-5 py-3 text-sm font-semibold text-[#20242a] transition hover:bg-slate-50"
                >
                  <ArrowLeft size={16} />
                  Change student
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#155966] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104a55]"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {/* ── Step 3 · Amount & type ───────────────────────────────────────── */}
      {step === 2 && (
        <SectionCard
          title="Amount"
          description={`Outstanding: ${formatINR(outstanding / 100)}`}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Amount *</span>
              <MoneyInput value={amount} onChange={setAmount} />
              {outstanding > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount((outstanding / 100).toFixed(2))}
                  className="mt-2 text-sm font-semibold text-[#155966] transition hover:underline"
                >
                  Pay full outstanding ({formatINR(outstanding / 100)})
                </button>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Payment Type</span>
              <select
                value={effectivePaymentType}
                onChange={(event) => {
                  setTypeTouched(true);
                  setPaymentType(event.target.value);
                }}
                className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10"
              >
                {PAYMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#8b939b]">
                {typeTouched ? "Overridden manually." : "Set automatically from the amount."}
              </span>
            </label>
          </div>

          {amountPaise > outstanding && amountPaise > 0 && (
            <div className="mt-5 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              This is {formatINR((amountPaise - outstanding) / 100)} more than the outstanding
              balance. It will be accepted and carried as an advance.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center gap-2 rounded border border-[#c7cbd1] px-5 py-3 text-sm font-semibold text-[#20242a] transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!isPayableAmount(amount)}
              className="inline-flex items-center justify-center gap-2 rounded bg-[#155966] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Step 4 · Method ──────────────────────────────────────────────── */}
      {step === 3 && (
        <SectionCard title="Payment method" description="How the money was received.">
          <PaymentMethodFields
            method={method}
            onMethodChange={(value) => {
              setMethod(value);
              setShowReferenceError(false);
            }}
            referenceNo={referenceNo}
            onReferenceChange={setReferenceNo}
            paidAt={paidAt}
            onPaidAtChange={setPaidAt}
            note={note}
            onNoteChange={setNote}
            showReferenceError={showReferenceError}
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center gap-2 rounded border border-[#c7cbd1] px-5 py-3 text-sm font-semibold text-[#20242a] transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              onClick={handleContinueFromMethod}
              className="inline-flex items-center justify-center gap-2 rounded bg-[#155966] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104a55]"
            >
              Review
              <ArrowRight size={16} />
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Step 5 · Confirm ─────────────────────────────────────────────── */}
      {step === 4 && (
        <SectionCard
          title="Confirm payment"
          description="Check this carefully — a recorded payment can only be reversed with a refund, which posts a separate ledger entry."
        >
          <dl className="divide-y divide-[#eef0f2] rounded-[14px] border border-[#eef0f2]">
            {[
              ["Student", `${student?.name ?? "-"}${student?.studentCode ? ` · ${student.studentCode}` : ""}`],
              ["Amount", formatINR(amountPaise / 100)],
              ["Payment type", PAYMENT_TYPES.find((t) => t.value === effectivePaymentType)?.label ?? effectivePaymentType],
              ["Method", METHOD_LABELS[method] ?? method],
              ["Reference", referenceNo.trim() || "-"],
              ["Payment date", paidAt || "Today"],
              ["Note", note.trim() || "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-[#5b626a]">{label}</dt>
                <dd className="text-right text-sm font-medium text-[#2a2d32]">{value}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 bg-[#f4f8f9] px-4 py-3">
              <dt className="text-sm font-semibold text-[#20242a]">Outstanding after payment</dt>
              <dd className="text-right text-[16px] font-semibold text-[#20242a]">
                {formatINR((outstanding - amountPaise) / 100)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={collectPayment.isPending}
              className="inline-flex items-center justify-center gap-2 rounded border border-[#c7cbd1] px-5 py-3 text-sm font-semibold text-[#20242a] transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={collectPayment.isPending || !isPayableAmount(amount)}
              className="inline-flex items-center justify-center gap-2 rounded bg-[#155966] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {collectPayment.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wallet size={16} />
              )}
              {collectPayment.isPending ? "Recording..." : `Collect ${formatINR(amountPaise / 100)}`}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
