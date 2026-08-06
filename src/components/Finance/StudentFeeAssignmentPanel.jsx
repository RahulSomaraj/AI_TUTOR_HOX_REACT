import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import PaginationControls from "../PaginationControls";
import DataTable from "../ui/DataTable";
import SchoolScopeSelect from "./SchoolScopeSelect";
import { fetchAllStudents } from "../../api/services/students";
import { fetchClasses } from "../../api/services/grades";
import { extractList, extractPagination, safeId } from "../../api/normalize";
import { formatINR } from "../../lib/currency";
import { useFeeStructureOptionsQuery } from "../../features/finance/useFeeStructures";
import { useClassFeesByGradeQuery, useEnsureClassFee } from "../../features/finance/useClassFees";
import {
    mapAssignmentRows,
    useAssignStudentFee,
    useBulkAssignStudentFee,
    useStudentFeesQuery,
    useUnassignStudentFee,
} from "../../features/finance/useStudentFees";

const PAGE_SIZE = 10;

// Stable identity so the row memo below doesn't re-run on every render while
// the query is still settling.
const EMPTY_ROWS = [];

function apiError(err, fallback) {
    return (
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        fallback
    );
}

function useGradeOptionsQuery(schoolId) {
    return useQuery({
        queryKey: ["grades", "options", schoolId],
        queryFn: async () => {
            const response = await fetchClasses({ schoolId, limit: 50 });
            return extractList(response, ["grades"]);
        },
        enabled: Boolean(schoolId),
    });
}

function mapFeeStructureOption(structure) {
    const value = safeId(structure?.id);
    const label = `${structure?.feeType?.name ?? "Fee"} — ${structure?.academicYear?.name ?? ""} (${formatINR(structure?.amount)})`;
    return { value, label, schoolId: safeId(structure?.academicYear?.schoolId) };
}

function gradeLabel(grade) {
    return grade?.aliasName || grade?.divisionName || `Grade ${grade?.id}`;
}

/**
 * Per-student assignment: pick a fee structure, then tick individual students
 * (or the whole class) to attach it to.
 *
 * Note this still works through a ClassFee under the hood — `useEnsureClassFee`
 * creates the structure↔grade link on first use so the caller doesn't have to
 * know it exists. The Class panel manages those links directly.
 */
export default function StudentFeeAssignmentPanel() {
    const [schoolId, setSchoolId] = useState("");
    const [gradeId, setGradeId] = useState("");
    const [feeStructureId, setFeeStructureId] = useState("");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [summary, setSummary] = useState(null);
    const [actionError, setActionError] = useState("");
    const [assigning, setAssigning] = useState(false);

    const gradeOptionsQuery = useGradeOptionsQuery(schoolId);
    const feeStructureOptionsQuery = useFeeStructureOptionsQuery();
    const classFeesQuery = useClassFeesByGradeQuery(gradeId);

    const ensureClassFee = useEnsureClassFee();
    const assignMutation = useAssignStudentFee();
    const bulkAssignMutation = useBulkAssignStudentFee();
    const unassignMutation = useUnassignStudentFee();

    const gradeOptions = gradeOptionsQuery.data ?? [];
    const feeStructureOptions = useMemo(
        () =>
            (feeStructureOptionsQuery.data ?? [])
                .map(mapFeeStructureOption)
                .filter((option) => !schoolId || option.schoolId === schoolId),
        [feeStructureOptionsQuery.data, schoolId]
    );

    const studentsQuery = useQuery({
        queryKey: ["students", "assignment", schoolId, gradeId, page],
        queryFn: async () => {
            const response = await fetchAllStudents({ schoolId, gradeId, page, limit: PAGE_SIZE });
            return {
                raw: extractList(response, ["users", "students"]),
                pagination: extractPagination(response, 0, PAGE_SIZE),
            };
        },
        enabled: Boolean(schoolId && gradeId),
        placeholderData: (previous) => previous,
    });

    const classFee = useMemo(
        () => (classFeesQuery.data ?? []).find((cf) => safeId(cf?.feeStructureId ?? cf?.feeStructure?.id) === feeStructureId),
        [classFeesQuery.data, feeStructureId]
    );

    // Filtered server-side by classFeeId now, so no client-side narrowing.
    const studentFeesQuery = useStudentFeesQuery(classFee?.id);
    const studentFeesForClassFee = studentFeesQuery.data ?? EMPTY_ROWS;

    const students = studentsQuery.data?.raw;
    const pagination = studentsQuery.data?.pagination;
    const rows = useMemo(
        () => mapAssignmentRows(students, studentFeesForClassFee),
        [students, studentFeesForClassFee]
    );

    const ready = Boolean(schoolId && gradeId && feeStructureId);
    const loadingStudents = studentsQuery.isPending && ready;
    const loadError = studentsQuery.isError ? apiError(studentsQuery.error, "Failed to load students") : "";

    const unassignedOnPage = rows.filter((row) => !row.isAssigned);
    const allUnassignedSelected =
        unassignedOnPage.length > 0 && unassignedOnPage.every((row) => selectedIds.has(row.id));

    useEffect(() => {
        setGradeId("");
        setFeeStructureId("");
    }, [schoolId]);

    useEffect(() => {
        setSelectedIds(new Set());
        setSummary(null);
        setPage(1);
    }, [schoolId, gradeId, feeStructureId]);

    function toggleSelectAll() {
        setSelectedIds((current) => {
            if (allUnassignedSelected) {
                const next = new Set(current);
                unassignedOnPage.forEach((row) => next.delete(row.id));
                return next;
            }
            const next = new Set(current);
            unassignedOnPage.forEach((row) => next.add(row.id));
            return next;
        });
    }

    function toggleRow(row) {
        if (row.isAssigned) return;
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(row.id)) next.delete(row.id);
            else next.add(row.id);
            return next;
        });
    }

    async function handleAssignSelected() {
        if (selectedIds.size === 0) return;
        setActionError("");
        setSummary(null);
        setAssigning(true);
        try {
            const targetClassFee = await ensureClassFee.mutateAsync({ feeStructureId, gradeId });
            const results = await Promise.allSettled(
                Array.from(selectedIds).map((studentId) =>
                    assignMutation.mutateAsync({ studentId: Number(studentId), classFeeId: targetClassFee.id })
                )
            );
            const assignedCount = results.filter((r) => r.status === "fulfilled").length;
            const skippedCount = results.length - assignedCount;
            setSummary({ mode: "selected", assignedCount, skippedCount });
            setSelectedIds(new Set());
        } catch (err) {
            setActionError(apiError(err, "Failed to assign the fee"));
        } finally {
            setAssigning(false);
        }
    }

    async function handleAssignEntireClass() {
        setActionError("");
        setSummary(null);
        setAssigning(true);
        try {
            const targetClassFee = await ensureClassFee.mutateAsync({ feeStructureId, gradeId });
            const response = await bulkAssignMutation.mutateAsync({ classFeeId: targetClassFee.id, gradeId: Number(gradeId) });
            const body = response?.data ?? {};
            setSummary({ mode: "class", assignedCount: body.assignedCount ?? 0, skippedCount: body.skippedCount ?? 0 });
            setSelectedIds(new Set());
        } catch (err) {
            setActionError(apiError(err, "Failed to assign the fee to the class"));
        } finally {
            setAssigning(false);
        }
    }

    async function handleUnassign(row) {
        setActionError("");
        try {
            await unassignMutation.mutateAsync(row.studentFeeId);
        } catch (err) {
            setActionError(apiError(err, "Failed to remove the assignment"));
        }
    }

    const totalStudents = pagination?.totalCount ?? rows.length;
    const startRow = totalStudents === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endRow = Math.min(page * PAGE_SIZE, totalStudents);

    const columns = [
        {
            key: "select",
            header: (
                <input
                    type="checkbox"
                    checked={allUnassignedSelected}
                    onChange={toggleSelectAll}
                    disabled={unassignedOnPage.length === 0}
                    className="h-4 w-4 accent-[#155966]"
                    aria-label="Select all unassigned students on this page"
                />
            ),
            render: (row) => (
                <input
                    type="checkbox"
                    checked={row.isAssigned || selectedIds.has(row.id)}
                    disabled={row.isAssigned}
                    onChange={() => toggleRow(row)}
                    className="h-4 w-4 accent-[#155966] disabled:opacity-50"
                    aria-label={`Select ${row.name}`}
                />
            ),
        },
        {
            key: "name",
            header: "Student",
            render: (row) => <span className="font-medium text-[#2a2d32]">{row.name}</span>,
        },
        { key: "studentCode", header: "Student Code" },
        { key: "contactEmail", header: "Email", render: (row) => row.contactEmail || "-" },
        {
            key: "status",
            header: "Status",
            render: (row) =>
                row.isAssigned ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Assigned
                    </span>
                ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Not assigned
                    </span>
                ),
        },
        {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (row) =>
                row.isAssigned ? (
                    <button
                        type="button"
                        onClick={() => handleUnassign(row)}
                        disabled={unassignMutation.isPending}
                        className="text-sm font-semibold text-[#d14343] transition hover:underline disabled:opacity-50"
                    >
                        Remove
                    </button>
                ) : null,
        },
    ];

    return (
        <>
            <div className="mb-6 grid gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 md:grid-cols-3">
                <div>
                    <span className="mb-1 block text-sm font-medium text-slate-700">School *</span>
                    <SchoolScopeSelect includeAll={false} value={schoolId} onChange={setSchoolId} />
                </div>

                <div>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Class *</span>
                    <select
                        value={gradeId}
                        onChange={(event) => setGradeId(event.target.value)}
                        disabled={!schoolId || gradeOptionsQuery.isPending}
                        className="h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb] disabled:text-[#9aa3aa]"
                    >
                        <option value="">{schoolId ? "Select class" : "Select a school first"}</option>
                        {gradeOptions.map((grade) => (
                            <option key={grade.id} value={safeId(grade.id)}>
                                {gradeLabel(grade)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Fee Structure *</span>
                    <select
                        value={feeStructureId}
                        onChange={(event) => setFeeStructureId(event.target.value)}
                        disabled={!schoolId}
                        className="h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb] disabled:text-[#9aa3aa]"
                    >
                        <option value="">{schoolId ? "Select fee structure" : "Select a school first"}</option>
                        {feeStructureOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
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

            {summary && (
                <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Assigned to {summary.assignedCount} student{summary.assignedCount === 1 ? "" : "s"}.
                    {summary.skippedCount > 0 && ` ${summary.skippedCount} already had this fee and were skipped.`}
                </div>
            )}

            <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
                        {ready ? `Students (${totalStudents})` : "Students"}
                    </h2>

                    {ready && (
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-[#5b626a]">{selectedIds.size} selected</span>
                            <button
                                type="button"
                                onClick={handleAssignSelected}
                                disabled={assigning || selectedIds.size === 0}
                                className="inline-flex items-center gap-2 rounded border border-[#155966] px-4 py-2 text-sm font-semibold text-[#155966] transition hover:bg-[#eef6f9] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {assigning && <Loader2 size={14} className="animate-spin" />}
                                Assign to Selected
                            </button>
                            <button
                                type="button"
                                onClick={handleAssignEntireClass}
                                disabled={assigning}
                                className="inline-flex items-center gap-2 rounded bg-[#155966] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {assigning && <Loader2 size={14} className="animate-spin" />}
                                Assign to Entire Class
                            </button>
                        </div>
                    )}
                </div>

                {!ready ? (
                    <div className="py-16 text-center text-sm text-[#5b626a]">
                        Select a school, class, and fee structure to see students.
                    </div>
                ) : (
                    <>
                        <DataTable
                            columns={columns}
                            rows={rows}
                            loading={loadingStudents}
                            error={loadError}
                            emptyLabel="No students found in this class."
                            rowKey={(row) => row.id}
                        />

                        {!loadingStudents && !loadError && rows.length > 0 && (
                            <PaginationControls
                                className="mt-6"
                                rangeLabel={`${startRow}-${endRow} of ${totalStudents}`}
                                currentPage={pagination?.currentPage ?? page}
                                totalPages={pagination?.totalPages ?? 1}
                                hasPrev={pagination?.hasPrev ?? page > 1}
                                hasNext={pagination?.hasNext ?? false}
                                onPrev={() => setPage((value) => Math.max(value - 1, 1))}
                                onNext={() =>
                                    setPage((value) => Math.min(value + 1, pagination?.totalPages || value + 1))
                                }
                            />
                        )}
                    </>
                )}
            </section>
        </>
    );
}
