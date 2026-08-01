import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import SearchInput from "../components/ui/SearchInput";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SchoolScopeSelect from "../components/Finance/SchoolScopeSelect";
import useDebounce from "../hooks/useDebounce";
import { extractList, safeId } from "../api/normalize";
import { fetchFeeStructures } from "../api/services/finance";
import { useSchoolQuery } from "../features/schools/useSchool";
import {
    useAcademicYearsQuery,
    useSaveAcademicYear,
    useDeleteAcademicYear,
    useActivateAcademicYear,
} from "../features/academicYears/useAcademicYears";

const PAGE_SIZE = 10;

function apiError(err, fallback) {
    return (
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        fallback
    );
}

function toDateInputValue(iso) {
    return iso ? iso.slice(0, 10) : "";
}

function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

function mapAcademicYearRow(year) {
    return {
        id: safeId(year?.id),
        name: year?.name ?? "Untitled Year",
        startDate: year?.startDate,
        endDate: year?.endDate,
        isActive: year?.isActive === true,
    };
}

function AcademicYearModal({ schoolId, initialData = null, onClose, onSuccess }) {
    const isEdit = Boolean(initialData);
    const [form, setForm] = useState({
        name: initialData?.name ?? "",
        startDate: toDateInputValue(initialData?.startDate),
        endDate: toDateInputValue(initialData?.endDate),
    });
    const [error, setError] = useState("");
    const saveMutation = useSaveAcademicYear();
    const saving = saveMutation.isPending;

    const setValue = (key) => (event) =>
        setForm((current) => ({ ...current, [key]: event.target.value }));

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.name.trim()) {
            setError("Name is required.");
            return;
        }
        if (!form.startDate || !form.endDate) {
            setError("Start and end dates are required.");
            return;
        }
        if (form.endDate <= form.startDate) {
            setError("End date must be after the start date.");
            return;
        }

        const payload = isEdit
            ? { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate }
            : { schoolId: Number(schoolId), name: form.name.trim(), startDate: form.startDate, endDate: form.endDate };

        try {
            setError("");
            await saveMutation.mutateAsync({ id: initialData?.id, payload });
            onSuccess();
            onClose();
        } catch (err) {
            setError(apiError(err, `Failed to ${isEdit ? "update" : "create"} academic year`));
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
            onClick={(event) => {
                if (event.target === event.currentTarget && !saving) onClose();
            }}
        >
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl"
            >
                <div className="mb-5 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-[#24272a]">
                        {isEdit ? "Edit Academic Year" : "Add Academic Year"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                        aria-label="Close academic year modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Name *</span>
                        <input
                            value={form.name}
                            onChange={setValue("name")}
                            disabled={saving}
                            maxLength={32}
                            placeholder="2026-2027"
                            className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">Start Date *</span>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={setValue("startDate")}
                                disabled={saving}
                                className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">End Date *</span>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={setValue("endDate")}
                                disabled={saving}
                                className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                            />
                        </label>
                    </div>

                    {!isEdit && (
                        <p className="text-xs text-[#8d969c]">
                            New years are created inactive. Use "Set Active" on the list afterward to make this
                            the school's current year.
                        </p>
                    )}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded bg-[#155966] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-60"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving
                            ? isEdit
                                ? "Saving..."
                                : "Adding..."
                            : isEdit
                                ? "Save Changes"
                                : "Add Academic Year"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function AcademicYearsPage() {
    const [searchParams] = useSearchParams();
    const [schoolId, setSchoolId] = useState(() => searchParams.get("schoolId") || "");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [modalMode, setModalMode] = useState(null);
    const [activeYear, setActiveYear] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionError, setActionError] = useState("");

    const debouncedSearch = useDebounce(search, 300);
    const scopedSchoolQuery = useSchoolQuery(schoolId);

    const yearsQuery = useAcademicYearsQuery({ schoolId, page, limit: PAGE_SIZE, search: debouncedSearch });
    const feeStructuresQuery = useQuery({
        queryKey: ["feeStructures", "all"],
        queryFn: async () => {
            const response = await fetchFeeStructures();
            return extractList(response, ["feeStructures"]);
        },
        enabled: Boolean(deleteTarget),
    });

    const deleteMutation = useDeleteAcademicYear();
    const deleting = deleteMutation.isPending;
    const activateMutation = useActivateAcademicYear();
    const activatingId = activateMutation.isPending ? activateMutation.variables : null;

    async function handleActivate(row) {
        setActionError("");
        try {
            await activateMutation.mutateAsync(row.id);
        } catch (err) {
            setActionError(apiError(err, "Failed to activate academic year"));
        }
    }

    const raw = yearsQuery.data?.raw;
    const pagination = yearsQuery.data?.pagination ?? {
        currentPage: page,
        totalPages: 1,
        totalCount: 0,
        pageSize: PAGE_SIZE,
        hasPrev: false,
        hasNext: false,
    };
    const loading = yearsQuery.isPending && Boolean(schoolId);
    const loadError = yearsQuery.isError ? apiError(yearsQuery.error, "Failed to load academic years") : "";
    const error = actionError || loadError;

    const rows = useMemo(() => (raw ?? []).map(mapAcademicYearRow), [raw]);
    const totalYears = pagination?.totalCount ?? rows.length;

    const dependentStructureCount = useMemo(() => {
        if (!deleteTarget) return 0;
        return (feeStructuresQuery.data ?? []).filter(
            (structure) => safeId(structure?.academicYearId ?? structure?.academicYear?.id) === deleteTarget.id
        ).length;
    }, [feeStructuresQuery.data, deleteTarget]);

    function openAddModal() {
        setActiveYear(null);
        setModalMode("add");
    }

    function openEditModal(row) {
        setActiveYear(row);
        setModalMode("edit");
    }

    function closeModal() {
        setModalMode(null);
        setActiveYear(null);
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setActionError("");
        try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
            if (rows.length === 1 && page > 1) {
                setPage((value) => Math.max(value - 1, 1));
            }
        } catch (err) {
            setActionError(apiError(err, "Failed to delete academic year"));
        }
    }

    const startRow = totalYears === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endRow = Math.min(page * PAGE_SIZE, totalYears);

    const columns = [
        {
            key: "name",
            header: "Name",
            render: (row) => <span className="font-medium text-[#2a2d32]">{row.name}</span>,
        },
        { key: "startDate", header: "Start Date", render: (row) => formatDate(row.startDate) },
        { key: "endDate", header: "End Date", render: (row) => formatDate(row.endDate) },
        {
            key: "status",
            header: "Status",
            render: (row) =>
                row.isActive ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Active
                    </span>
                ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Inactive
                    </span>
                ),
        },
        {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (row) => (
                <ActionMenu
                    label={row.name}
                    onEdit={() => openEditModal(row)}
                    onDelete={() => setDeleteTarget(row)}
                    extraItems={
                        row.isActive
                            ? []
                            : [
                                  {
                                      label: activatingId === row.id ? "Activating..." : "Set Active",
                                      icon: <Check size={14} className="text-[#155966]" />,
                                      onClick: () => handleActivate(row),
                                  },
                              ]
                    }
                />
            ),
        },
    ];

    return (
        <div className="ty-page-shell">
            <Breadcrumb
                items={
                    schoolId
                        ? [
                              { label: "Institution Management", path: "/schools" },
                              { label: scopedSchoolQuery.data?.schoolName ?? "Institution", path: `/schools/${schoolId}` },
                              { label: "Academic Years" },
                          ]
                        : [{ label: "Academic Years" }]
                }
            />
            <PageHeader
                title="Academic Years"
                subtitle={schoolId ? `${totalYears} Academic Years` : "Select a school to begin"}
                actionLabel="Add Academic Year"
                onAction={schoolId ? openAddModal : undefined}
            />

            <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="w-full sm:w-[260px]">
                    <SchoolScopeSelect
                        includeAll={false}
                        value={schoolId}
                        onChange={(nextId) => {
                            setSchoolId(nextId);
                            setPage(1);
                        }}
                    />
                </div>
                {schoolId && (
                    <SearchInput
                        value={search}
                        onChange={(value) => {
                            setSearch(value);
                            setPage(1);
                        }}
                        placeholder="Search academic years..."
                    />
                )}
            </div>

            <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
                <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
                    Academic Years
                </h2>

                {!schoolId ? (
                    <div className="py-16 text-center text-sm text-[#5b626a]">
                        Select a school above to view its academic years.
                    </div>
                ) : (
                    <>
                        <DataTable
                            columns={columns}
                            rows={rows}
                            loading={loading}
                            error={error}
                            emptyLabel="No academic years yet for this school — add the first one."
                            rowKey={(row) => row.id}
                        />

                        {!loading && !error && rows.length > 0 && (
                            <PaginationControls
                                className="mt-6"
                                rangeLabel={`${startRow}-${endRow} of ${totalYears}`}
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                hasPrev={pagination.hasPrev}
                                hasNext={pagination.hasNext}
                                onPrev={() => setPage((value) => Math.max(value - 1, 1))}
                                onNext={() =>
                                    setPage((value) => Math.min(value + 1, pagination.totalPages || value + 1))
                                }
                            />
                        )}
                    </>
                )}
            </section>

            {modalMode === "add" && schoolId && (
                <AcademicYearModal schoolId={schoolId} onClose={closeModal} onSuccess={() => setPage(1)} />
            )}

            {modalMode === "edit" && activeYear && (
                <AcademicYearModal
                    schoolId={schoolId}
                    initialData={activeYear}
                    onClose={closeModal}
                    onSuccess={() => {}}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Delete Academic Year"
                    message={
                        <>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-[#20242a]">{deleteTarget.name}</span>?
                            {dependentStructureCount > 0 && (
                                <span className="mt-2 block rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    {dependentStructureCount} fee structure{dependentStructureCount === 1 ? "" : "s"}{" "}
                                    still reference{dependentStructureCount === 1 ? "s" : ""} this year. They'll keep
                                    working, but this year will disappear from pickers.
                                </span>
                            )}
                        </>
                    }
                    confirmLabel="Delete"
                    busy={deleting}
                    onCancel={() => {
                        if (!deleting) setDeleteTarget(null);
                    }}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}
