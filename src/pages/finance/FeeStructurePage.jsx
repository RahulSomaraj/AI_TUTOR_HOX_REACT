import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import PaginationControls from "../../components/PaginationControls";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import DataTable from "../../components/ui/DataTable";
import ActionMenu from "../../components/ui/ActionMenu";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import MoneyInput from "../../components/Finance/MoneyInput";
import useDebounce from "../../hooks/useDebounce";
import { safeId } from "../../api/normalize";
import { formatINR, parseAmount } from "../../lib/currency";
import {
    useAcademicYearOptionsQuery,
    useDeleteFeeStructure,
    useFeeStructuresQuery,
    useSaveFeeStructure,
    useToggleFeeStructure,
} from "../../features/finance/useFeeStructures";
import { useFeeTypeOptionsQuery } from "../../features/finance/useFeeTypes";

const PAGE_SIZE = 10;

const FREQUENCY_OPTIONS = [
    { value: "ONE_TIME", label: "One Time" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "QUARTERLY", label: "Quarterly" },
    { value: "YEARLY", label: "Yearly" },
];
const FREQUENCY_LABELS = Object.fromEntries(
    FREQUENCY_OPTIONS.map((option) => [option.value, option.label])
);

function mapFeeStructureRow(structure, index) {
    const feeType = structure?.feeType;
    const year = structure?.academicYear;

    return {
        id: safeId(structure?.id ?? index),
        feeTypeId: safeId(structure?.feeTypeId ?? feeType?.id),
        academicYearId: safeId(structure?.academicYearId ?? year?.id),
        amount: structure?.amount ?? "0",
        frequency: structure?.frequency ?? "ONE_TIME",
        isActive: structure?.isActive !== false,
        feeTypeName: feeType?.name ?? "Unknown Fee Type",
        yearName: year?.name ?? "Unknown Year",
    };
}

function apiError(err, fallback) {
    return (
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        fallback
    );
}

function mapFeeTypeOption(feeType) {
    const id = safeId(feeType?.id);
    return { value: id, label: feeType?.name ?? "Fee Type" };
}

function mapAcademicYearOption(year) {
    const id = safeId(year?.id);
    const schoolName = year?.school?.schoolName;
    return {
        value: id,
        label: schoolName ? `${year?.name ?? "Year"} — ${schoolName}` : year?.name ?? "Year",
    };
}

function FeeStructureModal({
    initialData = null,
    feeTypeOptions,
    academicYearOptions,
    onClose,
    onSuccess,
}) {
    const isEdit = Boolean(initialData);
    const [form, setForm] = useState({
        feeTypeId: initialData?.feeTypeId ?? "",
        academicYearId: initialData?.academicYearId ?? "",
        amount: initialData ? String(initialData.amount) : "",
        frequency: initialData?.frequency ?? "ONE_TIME",
        isActive: initialData ? initialData.isActive : true,
    });
    const [error, setError] = useState("");
    const saveMutation = useSaveFeeStructure();
    const saving = saveMutation.isPending;

    const setValue = (key) => (event) => {
        const value =
            event.target.type === "checkbox" ? event.target.checked : event.target.value;
        setForm((current) => ({ ...current, [key]: value }));
    };

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.feeTypeId) {
            setError("Fee type is required.");
            return;
        }
        if (!form.academicYearId) {
            setError("Academic year is required.");
            return;
        }
        if (form.amount === "" || Number.isNaN(Number(form.amount))) {
            setError("A valid amount is required.");
            return;
        }

        const payload = {
            feeTypeId: Number(form.feeTypeId),
            academicYearId: Number(form.academicYearId),
            amount: parseAmount(form.amount),
            frequency: form.frequency,
            isActive: form.isActive,
        };

        try {
            setError("");
            await saveMutation.mutateAsync({ id: initialData?.id, payload });
            onSuccess();
            onClose();
        } catch (err) {
            setError(apiError(err, `Failed to ${isEdit ? "update" : "create"} fee structure`));
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
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-xl"
            >
                <div className="mb-5 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-[#24272a]">
                        {isEdit ? "Edit Fee Structure" : "Add Fee Structure"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                        aria-label="Close fee structure modal"
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
                        <span className="mb-1 block text-sm font-medium text-slate-700">Fee Type *</span>
                        <select
                            value={form.feeTypeId}
                            onChange={setValue("feeTypeId")}
                            disabled={saving}
                            className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                        >
                            <option value="">Select fee type</option>
                            {feeTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Academic Year *
                        </span>
                        <select
                            value={form.academicYearId}
                            onChange={setValue("academicYearId")}
                            disabled={saving}
                            className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                        >
                            <option value="">Select academic year</option>
                            {academicYearOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Amount *</span>
                        <MoneyInput
                            value={form.amount}
                            onChange={(value) => setForm((current) => ({ ...current, amount: value }))}
                            disabled={saving}
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Frequency</span>
                        <select
                            value={form.frequency}
                            onChange={setValue("frequency")}
                            disabled={saving}
                            className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                        >
                            {FREQUENCY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center gap-3 rounded border border-slate-200 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={setValue("isActive")}
                            disabled={saving}
                            className="h-4 w-4 accent-[#155966]"
                        />
                        <span className="text-sm font-medium text-slate-700">Active</span>
                    </label>
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
                                : "Add Fee Structure"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function FeeStructurePage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [modalMode, setModalMode] = useState(null);
    const [activeStructure, setActiveStructure] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionError, setActionError] = useState("");

    const debouncedSearch = useDebounce(search, 300);

    const structuresQuery = useFeeStructuresQuery({
        page,
        limit: pageSize,
        search: debouncedSearch,
    });
    const feeTypeOptionsQuery = useFeeTypeOptionsQuery();
    const academicYearOptionsQuery = useAcademicYearOptionsQuery();

    const deleteMutation = useDeleteFeeStructure();
    const deleting = deleteMutation.isPending;
    const toggleMutation = useToggleFeeStructure();
    const togglingId = toggleMutation.isPending ? toggleMutation.variables?.id : null;

    async function handleToggle(row) {
        setActionError("");
        try {
            await toggleMutation.mutateAsync(row);
        } catch (err) {
            setActionError(apiError(err, "Failed to update status"));
        }
    }

    const raw = structuresQuery.data?.raw;
    const pagination = structuresQuery.data?.pagination ?? {
        currentPage: page,
        totalPages: 1,
        totalCount: 0,
        pageSize,
        hasPrev: false,
        hasNext: false,
    };
    const loading = structuresQuery.isPending;
    const loadError = structuresQuery.isError
        ? apiError(structuresQuery.error, "Failed to load fee structures")
        : "";
    const error = actionError || loadError;

    const rows = useMemo(() => (raw ?? []).map(mapFeeStructureRow), [raw]);
    const totalStructures = pagination?.totalCount ?? rows.length;

    const feeTypeOptions = useMemo(
        () => (feeTypeOptionsQuery.data ?? []).map(mapFeeTypeOption),
        [feeTypeOptionsQuery.data]
    );
    const academicYearOptions = useMemo(
        () => (academicYearOptionsQuery.data ?? []).map(mapAcademicYearOption),
        [academicYearOptionsQuery.data]
    );

    function openAddModal() {
        setActiveStructure(null);
        setModalMode("add");
    }

    function openEditModal(row) {
        setActiveStructure(row);
        setModalMode("edit");
    }

    function closeModal() {
        setModalMode(null);
        setActiveStructure(null);
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
            setActionError(apiError(err, "Failed to delete fee structure"));
        }
    }

    const startRow = totalStructures === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRow = Math.min(page * pageSize, totalStructures);

    const columns = [
        {
            key: "feeTypeName",
            header: "Fee Type",
            render: (row) => <span className="font-medium text-[#2a2d32]">{row.feeTypeName}</span>,
        },
        { key: "yearName", header: "Academic Year" },
        {
            key: "amount",
            header: "Amount",
            render: (row) => formatINR(row.amount),
        },
        {
            key: "frequency",
            header: "Frequency",
            render: (row) => FREQUENCY_LABELS[row.frequency] ?? row.frequency,
        },
        {
            key: "status",
            header: "Status",
            render: (row) => (
                <button
                    type="button"
                    role="switch"
                    aria-checked={row.isActive}
                    disabled={togglingId === row.id}
                    onClick={() => handleToggle(row)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${row.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                    aria-label={`${row.isActive ? "Deactivate" : "Activate"} ${row.feeTypeName}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${row.isActive ? "translate-x-6" : "translate-x-1"
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
                <ActionMenu
                    label={row.feeTypeName}
                    onEdit={() => openEditModal(row)}
                    onDelete={() => setDeleteTarget(row)}
                />
            ),
        },
    ];

    return (
        <div className="ty-page-shell">
            <PageHeader
                title="Fee Structures"
                subtitle={`${totalStructures} Fee Structures`}
                actionLabel="Add Fee Structure"
                onAction={openAddModal}
            />

            <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5">
                <SearchInput
                    value={search}
                    onChange={(value) => {
                        setSearch(value);
                        setPage(1);
                    }}
                    placeholder="Search by fee type or academic year..."
                />
            </div>

            <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
                <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
                    Fee Structures List
                </h2>

                <DataTable
                    columns={columns}
                    rows={rows}
                    loading={loading}
                    error={error}
                    emptyLabel="No fee structures found."
                    rowKey={(row) => row.id}
                />

                {!loading && !error && rows.length > 0 && (
                    <PaginationControls
                        className="mt-6"
                        rowsPerPage={pageSize}
                        rowsPerPageOptions={[10, 20, 50]}
                        onRowsPerPageChange={(nextPageSize) => {
                            setPageSize(nextPageSize);
                            setPage(1);
                        }}
                        rangeLabel={`${startRow}-${endRow} of ${totalStructures}`}
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
            </section>

            {modalMode === "add" && (
                <FeeStructureModal
                    feeTypeOptions={feeTypeOptions}
                    academicYearOptions={academicYearOptions}
                    onClose={closeModal}
                    onSuccess={() => setPage(1)}
                />
            )}

            {modalMode === "edit" && activeStructure && (
                <FeeStructureModal
                    initialData={activeStructure}
                    feeTypeOptions={feeTypeOptions}
                    academicYearOptions={academicYearOptions}
                    onClose={closeModal}
                    onSuccess={() => {}}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Delete Fee Structure"
                    message={
                        <>
                            Are you sure you want to delete the fee structure for{" "}
                            <span className="font-semibold text-[#20242a]">
                                {deleteTarget.feeTypeName} — {deleteTarget.yearName}
                            </span>
                            ?
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
