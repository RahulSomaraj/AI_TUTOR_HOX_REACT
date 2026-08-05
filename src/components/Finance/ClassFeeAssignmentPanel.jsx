import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import DataTable from "../ui/DataTable";
import SchoolScopeSelect from "./SchoolScopeSelect";
import { fetchClasses } from "../../api/services/grades";
import { extractList, safeId } from "../../api/normalize";
import { formatINR } from "../../lib/currency";
import { useFeeStructureOptionsQuery } from "../../features/finance/useFeeStructures";
import {
  mapClassFeeRow,
  useAssignClassFee,
  useClassFeesByGradeQuery,
  useRemoveClassFee,
  useToggleClassFee,
} from "../../features/finance/useClassFees";

const FREQUENCY_LABELS = {
  ONE_TIME: "One Time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const FIELD_CLASS =
  "h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb] disabled:text-[#9aa3aa]";

function apiError(err, fallback) {
  const message = err?.response?.data?.message;
  return (Array.isArray(message) ? message.join(", ") : message) || err?.message || fallback;
}

function gradeLabel(grade) {
  return grade?.aliasName || grade?.divisionName || `Grade ${grade?.id}`;
}

/**
 * Assigns a fee structure to an entire class — i.e. creates the ClassFee
 * mapping directly, rather than going student-by-student.
 *
 * This is the level the data model actually works at: a ClassFee says "this
 * priced fee applies to this grade", and student assignments hang off it. The
 * student panel creates these mappings implicitly as a side effect; here they
 * are the thing being managed.
 */
export default function ClassFeeAssignmentPanel() {
  const [schoolId, setSchoolId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const gradeOptionsQuery = useQuery({
    queryKey: ["grades", "options", schoolId],
    queryFn: async () => {
      const response = await fetchClasses({ schoolId, limit: 50 });
      return extractList(response, ["grades"]);
    },
    enabled: Boolean(schoolId),
  });

  const feeStructureOptionsQuery = useFeeStructureOptionsQuery();
  const classFeesQuery = useClassFeesByGradeQuery(gradeId);

  const assignMutation = useAssignClassFee();
  const toggleMutation = useToggleClassFee();
  const removeMutation = useRemoveClassFee();

  const rows = useMemo(
    () => (classFeesQuery.data ?? []).map(mapClassFeeRow),
    [classFeesQuery.data]
  );

  // Only offer structures that aren't already on this class — the backend
  // answers a duplicate with 409, and an option that can only fail is noise.
  const assignedStructureIds = useMemo(
    () => new Set(rows.map((row) => row.feeStructureId)),
    [rows]
  );

  const feeStructureOptions = useMemo(
    () =>
      (feeStructureOptionsQuery.data ?? [])
        .filter((structure) => !schoolId || safeId(structure?.academicYear?.schoolId) === schoolId)
        .map((structure) => ({
          value: safeId(structure?.id),
          label: `${structure?.feeType?.name ?? "Fee"} — ${formatINR(structure?.amount)} · ${
            FREQUENCY_LABELS[structure?.frequency] ?? structure?.frequency ?? ""
          }`,
        }))
        .filter((option) => !assignedStructureIds.has(option.value)),
    [feeStructureOptionsQuery.data, schoolId, assignedStructureIds]
  );

  // Dependent state is cleared where the change happens rather than in an
  // effect keyed on it — an effect would fire a second render pass every time
  // the scope changes, and this codebase lints against setState-in-effect.
  function handleSchoolChange(nextSchoolId) {
    setSchoolId(nextSchoolId);
    setGradeId("");
    setFeeStructureId("");
    setActionError("");
    setNotice("");
  }

  function handleGradeChange(nextGradeId) {
    setGradeId(nextGradeId);
    setFeeStructureId("");
    setActionError("");
    setNotice("");
  }

  async function handleAssign() {
    if (!feeStructureId) return;
    setActionError("");
    setNotice("");
    try {
      await assignMutation.mutateAsync({ feeStructureId, gradeId });
      setFeeStructureId("");
      setNotice("Fee assigned to this class.");
    } catch (err) {
      // 409 is the documented duplicate case — say what it means rather than
      // echoing a conflict code at someone.
      setActionError(
        err?.response?.status === 409
          ? "That fee is already assigned to this class."
          : apiError(err, "Failed to assign the fee to this class")
      );
    }
  }

  async function handleToggle(row) {
    setActionError("");
    try {
      await toggleMutation.mutateAsync({ id: row.id, gradeId, isActive: !row.isActive });
    } catch (err) {
      setActionError(apiError(err, "Failed to update this fee"));
    }
  }

  async function handleRemove(row) {
    setActionError("");
    setNotice("");
    try {
      await removeMutation.mutateAsync({ id: row.id, gradeId });
      setNotice(`${row.name} removed from this class.`);
    } catch (err) {
      setActionError(apiError(err, "Failed to remove this fee"));
    }
  }

  const ready = Boolean(schoolId && gradeId);

  const columns = [
    {
      key: "name",
      header: "Fee Type",
      render: (row) => (
        <div>
          <span className="font-medium text-[#2a2d32]">{row.name}</span>
          {row.code && <span className="ml-2 text-xs text-[#8b939b]">{row.code}</span>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatINR(row.amount / 100),
    },
    {
      key: "frequency",
      header: "Frequency",
      render: (row) => FREQUENCY_LABELS[row.frequency] ?? row.frequency ?? "-",
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <button
          type="button"
          role="switch"
          aria-checked={row.isActive}
          disabled={toggleMutation.isPending}
          onClick={() => handleToggle(row)}
          aria-label={`${row.isActive ? "Deactivate" : "Activate"} ${row.name} for this class`}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            row.isActive ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              row.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleRemove(row)}
          disabled={removeMutation.isPending}
          className="text-sm font-semibold text-[#d14343] transition hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6 grid gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 md:grid-cols-2">
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">School *</span>
          <SchoolScopeSelect includeAll={false} value={schoolId} onChange={handleSchoolChange} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Class *</span>
          <select
            value={gradeId}
            onChange={(event) => handleGradeChange(event.target.value)}
            disabled={!schoolId || gradeOptionsQuery.isPending}
            className={FIELD_CLASS}
          >
            <option value="">{schoolId ? "Select class" : "Select a school first"}</option>
            {(gradeOptionsQuery.data ?? []).map((grade) => (
              <option key={grade.id} value={safeId(grade.id)}>
                {gradeLabel(grade)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {notice && (
        <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
              Fees for this class
            </h2>
            <p className="mt-2 text-sm text-[#5b626a]">
              Every student in the class is charged these once fee charges are posted.
            </p>
          </div>

          {ready && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Add a fee</span>
                <select
                  value={feeStructureId}
                  onChange={(event) => setFeeStructureId(event.target.value)}
                  disabled={feeStructureOptionsQuery.isPending}
                  className={`${FIELD_CLASS} w-[280px]`}
                >
                  <option value="">
                    {feeStructureOptions.length === 0
                      ? "No unassigned fee structures"
                      : "Select fee structure"}
                  </option>
                  {feeStructureOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!feeStructureId || assignMutation.isPending}
                className="inline-flex h-[40px] items-center gap-2 rounded bg-[#155966] px-5 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Assign to Class
              </button>
            </div>
          )}
        </div>

        {!ready ? (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            Select a school and class to see the fees assigned to it.
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            loading={classFeesQuery.isPending}
            error={
              classFeesQuery.isError
                ? apiError(classFeesQuery.error, "Failed to load this class's fees")
                : ""
            }
            emptyLabel="No fees assigned to this class yet."
            rowKey={(row) => row.id}
            minWidth={760}
          />
        )}
      </section>
    </>
  );
}
