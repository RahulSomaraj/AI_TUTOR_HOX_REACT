import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight,
  CirclePlus,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  createBoardGrade,
  deleteBoardGrade,
  fetchBoardGrades,
  updateBoardGrade,
} from "../api/authService";

function extractGrades(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.grades)) return response.grades;
  if (Array.isArray(response?.data?.grades)) return response.data.grades;
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

function mapGradeRow(grade) {
  return {
    id: grade?.id ?? grade?._id ?? grade?.gradeId ?? crypto.randomUUID(),
    name: grade?.name ?? grade?.gradeName ?? grade?.title ?? "Not available",
    boardId: grade?.boardId ?? null,
    description: grade?.description ?? grade?.details ?? "",
    isActive: grade?.isActive ?? grade?.active ?? true,
    syllabusProgress: grade?.syllabusProgress ?? 0,
  };
}

function AddGradeModal({ boardId, onClose, onSuccess }) {
  const [names, setNames] = useState([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const updateName = (index, value) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const addNameField = () => {
    setNames((prev) => [...prev, ""]);
  };

  const removeName = (index) => {
    setNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length === 0) {
      setError("Enter at least one grade name.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createBoardGrade({ boardId: Number(boardId), name: trimmed });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to create grade"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white px-8 py-7 shadow-[0_24px_60px_rgba(16,38,48,0.18)]"
      >
        <h2 className="mb-6 text-center text-[22px] font-bold text-[#20242a]">
          Add Grade
        </h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <span className="block text-[14px] font-medium text-[#334155]">
            Name
          </span>

          {names.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => updateName(index, e.target.value)}
                placeholder="Enter grade name"
                disabled={saving}
                className="h-11 flex-1 rounded-[10px] border border-[#6c5ecf] bg-white px-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#6c5ecf] focus:ring-2 focus:ring-[#6c5ecf]/15 disabled:bg-slate-50"
              />
              {index === names.length - 1 ? (
                <button
                  type="button"
                  onClick={addNameField}
                  disabled={saving}
                  className="flex-shrink-0 text-[#155966] transition hover:text-[#104a55] disabled:opacity-50"
                >
                  <CirclePlus size={26} strokeWidth={1.8} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeName(index)}
                  disabled={saving}
                  className="flex-shrink-0 text-[#94a3b8] transition hover:text-[#d14343] disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-[14px] border border-[#cdd7dc] py-2.5 text-[15px] font-medium text-[#44525b] transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#155966] py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditGradeModal({ grade, existingGrades, onClose, onSuccess }) {
  const [name, setName] = useState(grade.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const trimmedName = name.trim();
  const isDuplicate = existingGrades.some(
    (g) => g.id !== grade.id && g.name.toLowerCase() === trimmedName.toLowerCase()
  );
  const isUnchanged = trimmedName === grade.name;
  const saveDisabled = saving || !trimmedName || isUnchanged || isDuplicate;

  async function handleSave() {
    if (saveDisabled) return;
    try {
      setSaving(true);
      setError("");
      await updateBoardGrade(grade.id, {
        name: trimmedName,
        boardId: grade.boardId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update grade. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-7 shadow-[0_24px_60px_rgba(16,38,48,0.18)]">
        <h2 className="mb-6 text-center text-[22px] font-bold text-[#20242a]">
          Edit Grade
        </h2>

        <div className="space-y-2">
          <span className="block text-[14px] font-medium text-[#334155]">
            Name
          </span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="Enter grade name"
            disabled={saving}
            className="h-11 w-full rounded-[10px] border border-[#6c5ecf] bg-white px-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#6c5ecf] focus:ring-2 focus:ring-[#6c5ecf]/15 disabled:bg-slate-50"
          />
          {isDuplicate && trimmedName && (
            <p className="text-xs text-red-600">
              A grade with this name already exists.
            </p>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-[14px] border border-[#cdd7dc] py-2.5 text-[15px] font-medium text-[#44525b] transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#155966] py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GradeCardMenu({ onDelete, onEdit }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5b626a] transition hover:bg-[#eef6f9]"
      >
        <MoreHorizontal size={18} strokeWidth={2} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-[#e6edf0] bg-white shadow-[0_12px_32px_rgba(16,38,48,0.14)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#20242a] transition hover:bg-[#f3f8fa]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#d14343] transition hover:bg-[#fff5f5]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteGradeModal({ gradeName, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">Delete Grade</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{gradeName}</span>?
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl border border-[#d7dde2] py-2.5 text-sm font-medium text-[#5b626a] transition hover:bg-[#f7fafb] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GradeCard({ grade, onDelete, onEdit }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(18,53,64,0.07)]">
      <div className="mb-4 flex items-start justify-between">
        <span className="text-[20px] font-bold text-[#20242a]">{grade.name}</span>
        <GradeCardMenu onDelete={onDelete} onEdit={onEdit} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#e8e4f7]">
          <BookOpen size={18} className="text-[#6c5ecf]" strokeWidth={1.8} />
        </div>
        <span className="text-[14px] text-[#5b626a]">
          {grade.description || "—"}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between text-[14px]">
        <span className="text-[#5b626a]">Syllabus Progress</span>
        <span className="font-semibold text-[#20242a]">
          {grade.syllabusProgress}%
        </span>
      </div>

      <button
        type="button"
        className="mt-auto w-full rounded-xl border border-[#155966] py-2.5 text-[14px] font-semibold text-[#155966] transition hover:bg-[#eef6f9]"
      >
        View Details
      </button>
    </div>
  );
}

export default function BoardGradesPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const boardFromState = location.state?.board ?? null;

  const [board] = useState(boardFromState);
  const [grades, setGrades] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 12,
    hasPrev: false,
    hasNext: false,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      order: "desc",
      boardId: boardId ? Number(boardId) : undefined,
      name: search.trim() || undefined,
    }),
    [page, limit, boardId, search]
  );

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadGrades() {
        try {
          setLoading(true);
          setError("");

          const response = await fetchBoardGrades(queryParams);
          const extractedGrades = extractGrades(response).map(mapGradeRow);
          const extractedPagination = extractPagination(
            response,
            extractedGrades.length,
            limit
          );

          if (!cancelled) {
            setGrades(extractedGrades);
            setPagination(extractedPagination);
          }
        } catch (err) {
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load board grades";

          if (!cancelled) {
            setError(message);
            setGrades([]);
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
          if (!cancelled) setLoading(false);
        }
      }

      loadGrades();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [queryParams, limit, reloadKey]);

  const totalGrades = pagination?.totalCount ?? grades.length;

  async function handleDeleteGrade() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");
      await deleteBoardGrade(deleteTarget.id);
      setDeleteTarget(null);

      if (grades.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setReloadKey((value) => value + 1);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete board grade"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#eef6f9] px-4 py-7 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#cdd7dc] text-[#5b626a] transition hover:bg-white"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-[32px] font-bold leading-tight tracking-[0] text-[#20242a]">
              Board Grades
            </h1>
            <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
              {totalGrades} Board Grades
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          Add Grade
        </button>
      </div>

      {/* Search */}
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
            placeholder="Search grades..."
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#5b626a]">
          <Loader2 size={18} className="animate-spin" />
          Loading grades...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && grades.length === 0 && (
        <div className="py-20 text-center text-sm text-[#5b626a]">
          No grades found
        </div>
      )}

      {!loading && !error && grades.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {grades.map((grade) => (
              <GradeCard
                key={grade.id}
                grade={grade}
                onDelete={() => setDeleteTarget(grade)}
                onEdit={() => setEditTarget(grade)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex flex-col gap-4 text-sm text-[#3a3c42] xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span>Rows per page</span>
              <label className="relative inline-flex items-center">
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-10 appearance-none rounded-[10px] border border-[#c7cbd1] bg-[#f7f9fb] px-4 pr-10 text-[15px] text-[#3a3c42] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
                >
                  {[12, 24, 48].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronsLeftRight
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#6b7280]"
                  size={16}
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((v) => Math.max(v - 1, 1))}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c7cbd1] px-5 text-[15px] transition hover:border-[#155966] hover:text-[#155966] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={17} />
                Prev
              </button>
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() =>
                  setPage((v) => Math.min(v + 1, pagination.totalPages || v + 1))
                }
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c7cbd1] px-5 text-[15px] transition hover:border-[#155966] hover:text-[#155966] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <AddGradeModal
          boardId={boardId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setPage(1);
            setReloadKey((v) => v + 1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteGradeModal
          gradeName={deleteTarget.name}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteGrade}
        />
      )}

      {editTarget && (
        <EditGradeModal
          grade={editTarget}
          existingGrades={grades}
          onClose={() => setEditTarget(null)}
          onSuccess={() => setReloadKey((v) => v + 1)}
        />
      )}
    </div>
  );
}
