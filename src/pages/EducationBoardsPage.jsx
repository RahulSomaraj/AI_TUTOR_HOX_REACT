import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PaginationControls from "../components/PaginationControls";
import {
  createBoard,
  deleteBoard,
  fetchBoards,
  updateBoard,
} from "../api/authService";

function extractBoards(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.boards)) return response.boards;
  if (Array.isArray(response?.data?.boards)) return response.data.boards;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function extractPagination(response, fallbackCount, fallbackPageSize) {
  const pagination =
    response?.pagination ??
    response?.data?.pagination ??
    response?.meta ??
    response?.data?.meta ??
    null;

  if (pagination) {
    const currentPage = Number(
      pagination.currentPage ?? pagination.page ?? pagination.pageNumber ?? 1
    );
    const totalPages = Number(
      pagination.totalPages ??
        pagination.pageCount ??
        (pagination.totalCount && pagination.pageSize
          ? Math.ceil(pagination.totalCount / pagination.pageSize)
          : 1)
    );
    const totalCount = Number(
      pagination.totalCount ?? pagination.total ?? pagination.count ?? fallbackCount
    );
    const pageSize = Number(
      pagination.pageSize ?? pagination.limit ?? pagination.perPage ?? fallbackPageSize
    );

    return {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    };
  }

  return {
    currentPage: 1,
    totalPages: 1,
    totalCount: fallbackCount,
    pageSize: fallbackPageSize,
    hasPrev: false,
    hasNext: false,
  };
}

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

function ActionMenu({ boardName, onView, onEdit, onRemove }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [open]);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${boardName}`}
      >
        <MoreHorizontal size={22} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-[#e6edf0] bg-white shadow-[0_18px_42px_rgba(16,38,48,0.16)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[#20242a] transition hover:bg-[#f3f8fa]"
          >
            <Eye size={15} className="text-[#5b626a]" />
            View
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[#20242a] transition hover:bg-[#f3f8fa]"
          >
            <Pencil size={15} className="text-[#5b626a]" />
            Edit Board
          </button>
          <button
            type="button"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[#d14343] transition hover:bg-[#fff5f5]"
          >
            <Trash2 size={15} />
            Delete Board
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmDeleteModal({ boardName, deleting, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#122731]/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-[0_30px_80px_rgba(16,38,48,0.22)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f0]">
          <AlertTriangle size={24} className="text-[#d14343]" />
        </div>

        <h2 className="mt-5 text-center text-[24px] font-semibold text-[#20242a]">
          Delete Board
        </h2>
        <p className="mt-3 text-center text-sm leading-6 text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{boardName}</span>? This
          action cannot be undone.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#cdd7dc] px-5 text-sm font-medium text-[#44525b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#d14343] px-6 text-sm font-semibold text-white transition hover:bg-[#b93636] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deleting && <Loader2 size={16} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
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
          const extractedBoards = extractBoards(response).map(mapBoardRow);
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

  return (
    <div className="ty-page-shell">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ty-page-title">
            Education Boards
          </h1>
          <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
            {totalBoards} Education Boards
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          Add Board
        </button>
      </div>

      <div className="mb-6 rounded-[18px] bg-white px-4 py-4 sm:px-5">
        <label className="relative block w-full max-w-[370px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={20}
            strokeWidth={2}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search boards by name..."
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] tracking-[0] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Education Boards
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            Loading education boards...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && boards.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No education boards found.
          </div>
        )}

        {!loading && !error && boards.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="bg-[#e9f2f5]">
                    <th className="rounded-l-2xl px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">
                      Board Name
                    </th>
                    <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">
                      Full Name
                    </th>
                    <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">
                      Country
                    </th>
                    <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">
                      Status
                    </th>
                    <th className="rounded-r-2xl px-4 py-4 text-right text-[16px] font-medium text-[#16191d] sm:px-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((board) => (
                    <tr key={board.id} className="border-b border-[#eef0f2] last:border-b-0">
                      <td className="px-4 py-5 text-[15px] font-medium text-[#2a2d32] sm:px-5">
                        {board.name}
                      </td>
                      <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                        {board.fullName}
                      </td>
                      <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                        {board.country}
                      </td>
                      <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                        <StatusBadge isActive={board.isActive} />
                      </td>
                      <td className="px-4 py-5 text-right sm:px-5">
                        <ActionMenu
                          boardName={board.name}
                          onView={() => {
                            navigate(`/education-boards/${board.id}/grades`, {
                              state: { board },
                            });
                          }}
                          onEdit={() => {
                            setEditTarget(board);
                          }}
                          onRemove={() => {
                            setDeleteError("");
                            setDeleteTarget(board);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
        <ConfirmDeleteModal
          boardName={deleteTarget.name}
          deleting={deleting}
          error={deleteError}
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
