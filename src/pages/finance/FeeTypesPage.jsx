import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import PaginationControls from "../../components/PaginationControls";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import DataTable from "../../components/ui/DataTable";
import ActionMenu from "../../components/ui/ActionMenu";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import useDebounce from "../../hooks/useDebounce";
import { createFeeType, updateFeeType } from "../../api/services/finance";
import { safeId } from "../../api/normalize";
import {
    useDeleteFeeType,
    useFeeTypesQuery,
    useInvalidateFeeTypes,
    useToggleFeeType
} from "../../features/finance/useFeeTypes";

const PAGE_SIZE = 10;

function mapFeeTypeRow(feeType, index) {
    return {
        id: safeId(feeType?.id ?? feeType?._id ?? index),
        name: feeType?.name ?? "Untitled Fee Type",
        code: feeType?.code ?? "-",
        description: feeType?.description ?? "",
        isActive: feeType?.isActive !== false
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

function FeeTypeModal({ initialData = null, onClose, onSuccess }) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    code: initialData?.code === "-" ? "" : initialData?.code ?? "",
    description: initialData?.description ?? "",
    isActive: initialData ? initialData.isActive : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setValue = (key) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Fee type name is required.");
      return;
    }
    if (!form.code.trim()) {
      setError("Code is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      setError("");
      if (isEdit) {
        await updateFeeType(initialData.id, payload);
      } else {
        await createFeeType(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(apiError(err, `Failed to ${isEdit ? "update" : "create"} fee type`));
    } finally {
      setSaving(false);
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
            {isEdit ? "Edit Fee Type" : "Add Fee Type"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close fee type modal"
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
              placeholder="Tuition Fee"
              className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Code *</span>
            <input
              value={form.code}
              onChange={setValue("code")}
              disabled={saving}
              placeholder="TUITION"
              className="h-11 w-full rounded border border-slate-200 px-4 text-sm uppercase outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={setValue("description")}
              disabled={saving}
              rows={3}
              placeholder="Recurring academic tuition charges"
              className="w-full resize-none rounded border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
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
                : "Add Fee Type"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FeeTypesPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [modalMode, setModalMode] = useState(null);
    const [activeFeeType, setActiveFeeType] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionError, setActionError] = useState(null);
    
    const invalidateFeeTypes = useInvalidateFeeTypes();
    const deleteFeeTypeMutation = useDeleteFeeType();
    const deleting = deleteFeeTypeMutation.isPending;

    const debouncedSearch = useDebounce(search, 300);

    const feeTypesQuery = useFeeTypesQuery({
        page,
        limit: pageSize,
        search: debouncedSearch
    });

    const rawFeeTypes = feeTypesQuery.data?.raw;
    const pagination = feeTypesQuery.data?.pagination ?? {
        currentPage: page,
        totalPages: 1,
        totalCount: 0,
        pageSize,
        hasPrev: false,
        hasNext: false
    };
    const loading = feeTypesQuery.isPending;
    const loadError = feeTypesQuery.isError ? apiError(feeTypesQuery.error, "failed to load fee types : ") : "";
    const error = actionError || loadError;

    const feeTypes = useMemo(
        () => (rawFeeTypes ?? []).map(mapFeeTypeRow),
        [rawFeeTypes]
    );
    const totalFeeTypes = pagination?.totalCount ?? feeTypes.length;

    function openAddModal() {
        setActiveFeeType(null);
        setModalMode("add");
    }

    function openEditModal(feeType) {
        setActiveFeeType(feeType);
        setModalMode("edit");
    } 

    function closeModal() {
        setModalMode(null);
        setActiveFeeType(null);
    }

    async function handleDeleteFeeType() {
        if (!deleteTarget) return;
        setActionError("");
        try {
            await deleteFeeTypeMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
            if (feeTypes.length === 1 && page > 1) {
                setPage((value) => Math.max(value - 1, 1));
            }
        } catch (error) {
            setActionError(apiError(error, "Failed to delete fee type"));
        }
    }

    const startRow = totalFeeTypes === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRow = Math.min(page * pageSize, totalFeeTypes);

    const columns = [
        {
            key: "name",
            header: "Name",
            render: (row) => <span className="font-medium text-[#2a2d32]">{row.name}</span>
        },
        { key: "code", header: "Code" },
        {
            key: "description",
            header: "Description",
            render: (row) => row.description || "-"
        },
        {
            key: "status",
            header: "Status",
            render: (row) => (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500" }`}
                >
                    {row.isActive ? "Active" : "Inactive"}
                </span>
            )
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
                />
            )
        }
    ];

    return (
        <div className="ty-page-shell">
          <PageHeader
            title="Fee Types"
            subtitle={`${totalFeeTypes} Fee Types`}
            actionLabel="Add Fee Type"
            onAction={openAddModal}
          />
    
          <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search fee types by name..."
            />
          </div>
    
          <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
            <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
              Fee Types List
            </h2>
    
            <DataTable
              columns={columns}
              rows={feeTypes}
              loading={loading}
              error={error}
              emptyLabel="No fee types found."
              rowKey={(row) => row.id}
            />
    
            {!loading && !error && feeTypes.length > 0 && (
              <PaginationControls
                className="mt-6"
                rowsPerPage={pageSize}
                rowsPerPageOptions={[10, 20, 50]}
                onRowsPerPageChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }}
                rangeLabel={`${startRow}-${endRow} of ${totalFeeTypes}`}
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                hasPrev={pagination.hasPrev}
                hasNext={pagination.hasNext}
                onPrev={() => setPage((value) => Math.max(value - 1, 1))}
                onNext={() =>
                  setPage((value) =>
                    Math.min(value + 1, pagination.totalPages || value + 1)
                  )
                }
              />
            )}
          </section>
    
          {modalMode === "add" && (
            <FeeTypeModal
              onClose={closeModal}
              onSuccess={() => {
                setPage(1);
                invalidateFeeTypes();
              }}
            />
          )}
    
          {modalMode === "edit" && activeFeeType && (
            <FeeTypeModal
              initialData={activeFeeType}
              onClose={closeModal}
              onSuccess={invalidateFeeTypes}
            />
          )}
    
          {deleteTarget && (
            <ConfirmDialog
              title="Delete Fee Type"
              message={
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-[#20242a]">{deleteTarget.name}</span>?
                </>
              }
              confirmLabel="Delete"
              busy={deleting}
              onCancel={() => {
                if (!deleting) setDeleteTarget(null);
              }}
              onConfirm={handleDeleteFeeType}
            />
          )}
        </div>
      );
}