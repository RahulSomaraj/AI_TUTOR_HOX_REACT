import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PaginationControls from "../components/PaginationControls";
import PageHeader from "../components/ui/PageHeader";
import SearchInput from "../components/ui/SearchInput";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { extractList, extractPagination } from "../api/normalize";
import {
  createBoard,
  deleteBoard,
  fetchBoards,
  updateBoard,
} from "../api/authService";

function mapBoardRow(board) {
  return {
    id: board?.id ?? board?._id ?? board?.boardId ?? board?.name ?? crypto.randomUUID(),
    name: board?.name ?? board?.boardName ?? "Not available",
    fullName:
      board?.fullName ??
      board?.description ??
      board?.boardFullName ??
      board?.title ??
      "Not available",
    country:
      board?.country ??
      board?.countryName ??
      board?.location ??
      "Not available",
    isActive: board?.isActive ?? board?.active ?? true,
  };
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex min-w-[84px] justify-center rounded-full px-4 py-1.5 text-sm font-medium ${
        isActive
          ? "bg-[#e7f5ec] text-[#1d7a45]"
          : "bg-[#f3f4f6] text-[#5b626a]"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function BoardFormModal({ initialData = null, onClose, onSuccess }) {
  const isEdit = initialData !== null;
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    fullName: initialData?.fullName ?? "",
    country: initialData?.country ?? "",
    description:
      initialData?.description && initialData.description !== "Not available"
        ? initialData.description
        : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setValue = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, saving]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Board name is required.");
      return;
    }

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.country.trim()) {
      setError("Country is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        fullName: form.fullName.trim(),
        country: form.country.trim(),
        description: form.description.trim(),
      };

      if (isEdit) {
        await updateBoard(initialData.id, payload);
      } else {
        await createBoard(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Failed to ${isEdit ? "update" : "create"} education board`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#122731]/45 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(16,38,48,0.22)]"
      >
        <div className="border-b border-[#e6edf0] bg-[linear-gradient(135deg,#f5fbfd_0%,#eef6f9_100%)] px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#155966]">
                Education Board
              </p>
              <h2 className="mt-2 text-[28px] font-bold leading-tight text-[#20242a]">
                {isEdit ? "Edit Board" : "Add New Board"}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[#5b626a]">
                {isEdit
                  ? "Update the education board details and save your changes."
                  : "Create a new education board with the details required by the API."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d5dde1] text-[#5b626a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close add board modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-7">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#334155]">
                Board Name *
              </span>
              <input
                value={form.name}
                onChange={setValue("name")}
                placeholder="CBSE"
                disabled={saving}
                className="h-12 w-full rounded-[14px] border border-[#d6dde1] bg-[#fbfcfd] px-4 text-sm text-[#20242a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#334155]">
                Country *
              </span>
              <input
                value={form.country}
                onChange={setValue("country")}
                placeholder="India"
                disabled={saving}
                className="h-12 w-full rounded-[14px] border border-[#d6dde1] bg-[#fbfcfd] px-4 text-sm text-[#20242a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-[#334155]">
              Full Name *
            </span>
            <input
              value={form.fullName}
              onChange={setValue("fullName")}
              placeholder="Central Board of Secondary Education"
              disabled={saving}
              className="h-12 w-full rounded-[14px] border border-[#d6dde1] bg-[#fbfcfd] px-4 text-sm text-[#20242a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-[#334155]">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={setValue("description")}
              placeholder="National level board"
              rows={5}
              disabled={saving}
              className="w-full resize-none rounded-[14px] border border-[#d6dde1] bg-[#fbfcfd] px-4 py-3 text-sm text-[#20242a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>

        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#e6edf0] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#cdd7dc] px-5 text-sm font-medium text-[#44525b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#155966] px-6 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Board"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EducationBoardsPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 10,
    hasPrev: false,
    hasNext: false,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      order: "desc",
      name: search.trim() || undefined,
    }),
    [limit, page, search]
  );

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadBoards() {
        try {
          setLoading(true);
          setError("");

          const response = await fetchBoards(queryParams);
          const extractedBoards = extractList(response, ["boards", "data"]).map(
            mapBoardRow
          );
          const extractedPagination = extractPagination(
            response,
            extractedBoards.length,
            limit
          );

          if (!cancelled) {
            setBoards(extractedBoards);
            setPagination(extractedPagination);
          }
        } catch (err) {
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load education boards";

          if (!cancelled) {
            setError(message);
            setBoards([]);
            setPagination({
              currentPage: 1,
              totalPages: 1,
              totalCount: 0,
              pageSize: limit,
              hasPrev: false,
              hasNext: false,
            });
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      loadBoards();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [queryParams, limit, reloadKey]);

  const totalBoards = pagination?.totalCount ?? boards.length;
  const startRow = totalBoards === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, totalBoards);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      setDeleteError("");
      await deleteBoard(deleteTarget.id);

      const remaining = Math.max(totalBoards - 1, 0);
      const newLastPage = Math.max(Math.ceil(remaining / limit), 1);
      const nextPage = Math.min(page, newLastPage);

      setDeleteTarget(null);

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        setReloadKey((value) => value + 1);
      }
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete education board"
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "name", header: "Board Name" },
    { key: "fullName", header: "Full Name" },
    { key: "country", header: "Country" },
    {
      key: "status",
      header: "Status",
      render: (board) => <StatusBadge isActive={board.isActive} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (board) => (
        <ActionMenu
          label={board.name}
          extraItems={[
            {
              label: "View",
              icon: <Eye size={14} className="text-[#155966]" />,
              onClick: () => {
                navigate(`/education-boards/${board.id}/grades`, {
                  state: { board },
                });
              },
            },
          ]}
          onEdit={() => {
            setEditTarget(board);
          }}
          onDelete={() => {
            setDeleteError("");
            setDeleteTarget(board);
          }}
        />
      ),
    },
  ];

  return (
    <div className="ty-page-shell">
      <PageHeader
        title="Education Boards"
        subtitle={`${totalBoards} Education Boards`}
        actionLabel="Add Board"
        onAction={() => setShowAddModal(true)}
      />

      <div className="mb-6 rounded-[18px] bg-white px-4 py-4 sm:px-5">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search boards by name..."
        />
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Education Boards
        </h2>

        <DataTable
          columns={columns}
          rows={boards}
          loading={loading}
          error={error}
          emptyLabel="No education boards found."
          rowKey={(board) => board.id}
          minWidth={960}
        />

        {!loading && !error && boards.length > 0 && (
          <>
            <PaginationControls
              className="mt-6"
              rowsPerPage={limit}
              rowsPerPageOptions={[10, 20, 50]}
              onRowsPerPageChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
              rangeLabel={`${startRow}-${endRow} of ${totalBoards}`}
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
          </>
        )}
      </section>

      {showAddModal && (
        <BoardFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setPage(1);
            setReloadKey((value) => value + 1);
          }}
        />
      )}

      {editTarget && (
        <BoardFormModal
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setReloadKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Board"
          message={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#20242a]">
                {deleteTarget.name}
              </span>
              ? This action cannot be undone.
              {deleteError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}
            </>
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
