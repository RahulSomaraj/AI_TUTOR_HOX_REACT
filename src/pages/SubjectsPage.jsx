import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import {
  createSubject,
  deleteSubject,
  fetchBoardGrades,
  fetchBoards,
  fetchSubjects,
  updateSubject,
  uploadFile,
} from "../api/authService";

const PAGE_SIZE = 10;
const DROPDOWN_LIMIT = 10;

function extractList(response, keys) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  return [];
}

function extractPagination(response, fallbackCount = 0, fallbackPageSize = PAGE_SIZE) {
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

function safeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function mapBoard(board) {
  return {
    id: safeId(board?.id ?? board?._id),
    label: board?.name ?? board?.boardName ?? "Board",
  };
}

function mapGrade(grade) {
  const rawBoard = grade?.board ?? grade?.educationBoard ?? null;

  return {
    id: safeId(grade?.id ?? grade?._id ?? grade?.boardGradeId),
    boardGradeId: safeId(grade?.boardGradeId ?? grade?.id ?? grade?._id),
    label: grade?.aliasName ?? grade?.name ?? grade?.gradeName ?? "Class",
    boardId: safeId(grade?.boardId ?? rawBoard?.id ?? rawBoard?._id),
    boardName:
      grade?.boardName ?? rawBoard?.name ?? rawBoard?.boardName ?? "Not assigned",
  };
}

function getSubjectId(subject, index) {
  return safeId(subject?.id ?? subject?._id ?? subject?.uuid ?? subject?.code ?? index);
}

function getSubjectName(subject) {
  return (
    subject?.name ??
    subject?.subjectName ??
    subject?.title ??
    subject?.code ??
    "Untitled Subject"
  );
}

function mapSubjectRow(subject, index, gradeOptions, boardOptions) {
  const boardId = safeId(subject?.boardId ?? subject?.board?.id ?? subject?.board?._id);
  const boardGradeId = safeId(
    subject?.boardGradeId ??
      subject?.boardGrade?.id ??
      subject?.gradeId ??
      subject?.grade?.id
  );

  const matchedGrade = gradeOptions.find(
    (grade) =>
      grade.boardGradeId === boardGradeId ||
      grade.id === boardGradeId ||
      (grade.id && grade.id === safeId(subject?.gradeId))
  );
  const matchedBoard = boardOptions.find((board) => board.id === boardId);

  return {
    id: getSubjectId(subject, index),
    name: getSubjectName(subject),
    code: subject?.code ?? "-",
    boardId: boardId || matchedGrade?.boardId || "",
    boardName:
      subject?.boardName ??
      subject?.board?.name ??
      matchedBoard?.label ??
      matchedGrade?.boardName ??
      "-",
    boardGradeId: boardGradeId || matchedGrade?.boardGradeId || "",
    boardGradeLabel:
      subject?.gradeName ??
      subject?.boardGrade?.name ??
      subject?.boardGrade?.aliasName ??
      matchedGrade?.label ??
      "-",
    description: subject?.description ?? "",
    isOptional: Boolean(subject?.isOptional),
    isActive: subject?.isActive !== false,
    images: Array.isArray(subject?.images) ? subject.images : [],
  };
}

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutside();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onOutside, ref]);
}

function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

function SearchableSelect({
  value,
  onChange,
  onSearch,
  options = [],
  placeholder = "Select",
  searchPlaceholder = "Search...",
  disabled = false,
  loading = false,
  emptyLabel = "No results found",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query);

  useOutsideClick(ref, () => {
    setOpen(false);
    setQuery("");
  });

  useEffect(() => {
    if (open) {
      onSearch?.(debouncedQuery);
    }
  }, [debouncedQuery, onSearch, open]);

  function handleOpen() {
    if (disabled) return;
    setOpen((current) => !current);
    setQuery("");
    onSearch?.("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(option) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex h-[40px] w-full items-center justify-between gap-3 rounded-[12px] border px-4 text-left text-[14px] outline-none transition ${
          disabled
            ? "cursor-not-allowed border-[#dce3e7] bg-[#f8fafb] text-[#9aa3aa]"
            : "border-[#c7cbd1] bg-white text-[#5b626a] hover:border-[#155966]"
        } ${open ? "border-[#155966] ring-2 ring-[#155966]/15" : ""}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {loading && !options.length ? "Loading..." : value?.label || placeholder}
        </span>
        {loading && open ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-[#155966]" />
        ) : (
          <ChevronDown
            className={`shrink-0 text-[#5b626a] transition ${open ? "rotate-180" : ""}`}
            size={16}
            strokeWidth={2}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[#eef0f2] px-3 py-2">
            <Search size={14} className="shrink-0 text-[#7c858c]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#20242a] outline-none placeholder:text-[#8d969c]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded p-1 text-[#7c858c] transition hover:bg-[#f3f7f8]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-[#155966]" />
              </div>
            ) : options.length === 0 ? (
              <p className="px-4 py-4 text-center text-xs text-[#8d969c]">
                {emptyLabel}
              </p>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#f5fafc] ${
                    value?.value === option.value
                      ? "font-semibold text-[#155966]"
                      : "text-[#30363b]"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function mapBoardOption(board) {
  const mapped = mapBoard(board);
  return {
    ...mapped,
    value: mapped.id,
  };
}

function mapGradeOption(grade) {
  const mapped = mapGrade(grade);
  return {
    ...mapped,
    value: mapped.boardGradeId || mapped.id,
  };
}

function normalizeBoardList(response) {
  return extractList(response, ["boards", "educationBoards"]).map(mapBoardOption);
}

function normalizeGradeList(response) {
  return extractList(response, ["boardGrades", "grades"]).map(mapGradeOption);
}

function getOption(options, value, fallbackLabel = "Selected") {
  if (!value) return null;
  return (
    options.find((option) => option.value === value || option.id === value) ?? {
      value,
      id: value,
      label: fallbackLabel,
    }
  );
}

function mergeOption(options, option) {
  if (!option?.value) return options;
  if (options.some((item) => item.value === option.value)) return options;
  return [option, ...options];
}

function ActionMenu({ subjectName, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${subjectName}`}
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
          >
            <Pencil size={14} className="text-[#155966]" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#d14343] transition hover:bg-[#fff5f5]"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SubjectModal({
  initialData = null,
  boards,
  loadingBoards,
  onBoardSearch,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    boardGradeId: initialData?.boardGradeId ?? "",
    boardId: initialData?.boardId ?? "",
    isOptional: Boolean(initialData?.isOptional),
    imageUrl: Array.isArray(initialData?.images) ? initialData.images.join(", ") : "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [modalGrades, setModalGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const selectedBoard = getOption(
    boards,
    safeId(form.boardId),
    initialData?.boardName || "Selected Board"
  );
  const selectedGrade = getOption(
    modalGrades,
    safeId(form.boardGradeId),
    initialData?.boardGradeLabel || "Selected Board Grade"
  );

  const gradeOptions = useMemo(
    () => mergeOption(modalGrades, selectedGrade),
    [modalGrades, selectedGrade]
  );

  const searchModalGrades = useCallback(
    async (query = "") => {
      if (!form.boardId) {
        setModalGrades([]);
        return;
      }

      try {
        setLoadingGrades(true);
        const response = await fetchBoardGrades({
          page: 1,
          limit: DROPDOWN_LIMIT,
          order: "desc",
          boardId: Number(form.boardId),
          name: query.trim() || undefined,
        });
        setModalGrades(normalizeGradeList(response));
      } catch (err) {
        console.error("Failed to load board grades:", err);
        setModalGrades([]);
      } finally {
        setLoadingGrades(false);
      }
    },
    [form.boardId]
  );

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  useEffect(() => {
    searchModalGrades("");
  }, [searchModalGrades]);

  const setValue = (key) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleBoardChange = (option) => {
    setForm((current) => ({
      ...current,
      boardId: option?.value || "",
      boardGradeId: "",
    }));
    setModalGrades([]);
  };

  const handleGradeChange = (option) => {
    setForm((current) => ({
      ...current,
      boardGradeId: option?.value || "",
    }));
  };

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");
      const url = await uploadFile(file);
      if (!url) throw new Error("Upload did not return a file URL.");
      setForm((current) => ({ ...current, imageUrl: url }));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Image upload failed."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage() {
    setForm((current) => ({ ...current, imageUrl: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Subject name is required.");
      return;
    }

    if (!form.boardGradeId) {
      setError("Board grade is required.");
      return;
    }

    if (!form.boardId) {
      setError("Board is required.");
      return;
    }

    const images = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      boardGradeId: Number(form.boardGradeId),
      boardId: Number(form.boardId),
      isOptional: form.isOptional,
      images,
    };

    try {
      setSaving(true);
      setError("");

      if (isEdit) {
        await updateSubject(initialData.id, payload);
      } else {
        await createSubject(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Failed to ${isEdit ? "update" : "create"} subject`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#24272a]">
            {isEdit ? "Edit Subject" : "Add Subject"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close subject modal"
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
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Subject Name *
            </span>
            <input
              value={form.name}
              onChange={setValue("name")}
              disabled={saving}
              placeholder="Mathematics"
              className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
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
              placeholder="Introduction to Mathematics"
              rows={3}
              className="w-full resize-none rounded border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Board *
              </span>
              <SearchableSelect
                value={selectedBoard}
                onChange={handleBoardChange}
                onSearch={onBoardSearch}
                options={mergeOption(boards, selectedBoard)}
                placeholder="Select Board"
                searchPlaceholder="Search board..."
                disabled={saving}
                loading={loadingBoards}
                emptyLabel="No boards found"
              />
            </div>

            <div className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Board Grade *
              </span>
              <SearchableSelect
                value={selectedGrade}
                onChange={handleGradeChange}
                onSearch={searchModalGrades}
                options={gradeOptions}
                placeholder={form.boardId ? "Select Board Grade" : "Select board first"}
                searchPlaceholder="Search grade..."
                disabled={saving || !form.boardId}
                loading={loadingGrades}
                emptyLabel="No grades found"
              />
            </div>
          </div>

          <div className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Subject Image
            </span>
            <div className="flex flex-col gap-3 rounded border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center">
              <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded border border-dashed border-slate-300 bg-white sm:w-32">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt={form.name ? `${form.name} subject` : "Subject"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon size={24} className="text-slate-400" />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving || uploadingImage}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#155966] px-4 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-60"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={16} />
                      Upload Image
                    </>
                  )}
                </button>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={saving || uploadingImage}
                    className="inline-flex h-10 items-center justify-center rounded border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-60"
                  >
                    Remove Image
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={form.isOptional}
              onChange={setValue("isOptional")}
              disabled={saving}
              className="h-4 w-4 accent-[#155966]"
            />
            <span className="text-sm font-medium text-slate-700">
              Optional subject
            </span>
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
            {saving ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save Changes" : "Add Subject"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteSubjectModal({ subjectName, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">Delete Subject</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{subjectName}</span>?
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

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [boards, setBoards] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: PAGE_SIZE,
    hasPrev: false,
    hasNext: false,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const searchBoards = useCallback(async (query = "") => {
    try {
      setLoadingBoards(true);
      const response = await fetchBoards({
        page: 1,
        limit: DROPDOWN_LIMIT,
        order: "desc",
        name: query.trim() || undefined,
      });
      setBoards(normalizeBoardList(response));
    } catch (err) {
      console.error("Failed to load education boards:", err);
      setBoards([]);
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  const searchGrades = useCallback(
    async (query = "") => {
      if (!selectedBoardId) {
        setGrades([]);
        return;
      }

      try {
        setLoadingGrades(true);
        const response = await fetchBoardGrades({
          page: 1,
          limit: DROPDOWN_LIMIT,
          order: "desc",
          boardId: Number(selectedBoardId),
          name: query.trim() || undefined,
        });
        setGrades(normalizeGradeList(response));
      } catch (err) {
        console.error("Failed to load board grades:", err);
        setGrades([]);
      } finally {
        setLoadingGrades(false);
      }
    },
    [selectedBoardId]
  );

  useEffect(() => {
    searchBoards("");
  }, [searchBoards]);

  useEffect(() => {
    setSelectedGradeId("");
    setGrades([]);

    if (selectedBoardId) {
      searchGrades("");
    }
  }, [searchGrades, selectedBoardId]);

  const selectedBoard = useMemo(
    () => getOption(boards, selectedBoardId, "Selected Board"),
    [boards, selectedBoardId]
  );

  const selectedGrade = useMemo(
    () => getOption(grades, selectedGradeId, "Selected Board Grade"),
    [grades, selectedGradeId]
  );

  const boardOptions = useMemo(
    () => [{ value: "", id: "", label: "All Boards" }, ...mergeOption(boards, selectedBoard)],
    [boards, selectedBoard]
  );

  const gradeOptions = useMemo(
    () => [{ value: "", id: "", label: "All Board Grades" }, ...mergeOption(grades, selectedGrade)],
    [grades, selectedGrade]
  );

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetchSubjects({
          page,
          limit: pageSize,
          order: "desc",
          name: search.trim() || undefined,
          boardGradeId: selectedGradeId || undefined,
          boardId: selectedBoardId || undefined,
        });

        const list = extractList(response, ["subjects"]).map((subject, index) =>
          mapSubjectRow(subject, index, grades, boards)
        );

        if (!cancelled) {
          setSubjects(list);
          setPagination(extractPagination(response, list.length, pageSize));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Failed to load subjects"
          );
          setSubjects([]);
          setPagination(extractPagination(null, 0, pageSize));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [boards, grades, page, pageSize, refreshKey, search, selectedBoardId, selectedGradeId]);

  const totalSubjects = pagination?.totalCount ?? subjects.length;

  function openAddModal() {
    setActiveSubject(null);
    setModalMode("add");
  }

  function openEditModal(subject) {
    setActiveSubject(subject);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setActiveSubject(null);
  }

  async function handleDeleteSubject() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteSubject(deleteTarget.id);
      setDeleteTarget(null);

      if (subjects.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete subject"
      );
    } finally {
      setDeleting(false);
    }
  }

  const startRow = totalSubjects === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalSubjects);

  return (
    <div className="ty-page-shell">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ty-page-title">
            Subjects
          </h1>
          <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
            {totalSubjects} Subjects
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          Add Subject
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
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
            placeholder="Search subjects by name..."
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <div className="relative block w-full sm:w-[190px]">
            <SearchableSelect
              value={selectedBoard}
              onChange={(option) => {
                setSelectedBoardId(option?.value || "");
                setPage(1);
              }}
              onSearch={searchBoards}
              options={boardOptions}
              placeholder="All Boards"
              searchPlaceholder="Search board..."
              loading={loadingBoards}
              emptyLabel="No boards found"
            />
          </div>

          <div className="relative block w-full sm:w-[220px]">
            <SearchableSelect
              value={selectedGrade}
              onChange={(option) => {
                setSelectedGradeId(option?.value || "");
                setPage(1);
              }}
              onSearch={searchGrades}
              options={gradeOptions}
              placeholder={selectedBoardId ? "All Board Grades" : "Select board first"}
              searchPlaceholder="Search grade..."
              disabled={!selectedBoardId}
              loading={loadingGrades}
              emptyLabel="No grades found"
            />
          </div>
        </div>
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Subjects List
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
            <p className="mt-3">Loading subjects...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && subjects.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No subjects found.
          </div>
        )}

        {!loading && !error && subjects.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-[#edf0f2]">
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Name
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Code
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Board
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Board Grade
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Optional
                    </th>
                    <th className="px-3 py-4 text-right text-[16px] font-medium text-[#16191d]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-b border-[#eef0f2] last:border-b-0"
                    >
                      <td className="px-3 py-5 text-[15px] font-medium text-[#2a2d32]">
                        {subject.name}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {subject.code}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {subject.boardName}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {subject.boardGradeLabel}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {subject.isOptional ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-5 text-right">
                        <ActionMenu
                          subjectName={subject.name}
                          onEdit={() => openEditModal(subject)}
                          onDelete={() => setDeleteTarget(subject)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              className="mt-6"
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 20, 50]}
              onRowsPerPageChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
              rangeLabel={`${startRow}-${endRow} of ${totalSubjects}`}
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

      {modalMode === "add" && (
        <SubjectModal
          boards={boards}
          loadingBoards={loadingBoards}
          onBoardSearch={searchBoards}
          onClose={closeModal}
          onSuccess={() => {
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {modalMode === "edit" && activeSubject && (
        <SubjectModal
          initialData={activeSubject}
          boards={boards}
          loadingBoards={loadingBoards}
          onBoardSearch={searchBoards}
          onClose={closeModal}
          onSuccess={() => {
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteSubjectModal
          subjectName={deleteTarget.name}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleDeleteSubject}
        />
      )}
    </div>
  );
}
