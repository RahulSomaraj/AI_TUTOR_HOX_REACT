import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ImageIcon,
  ImageOff,
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
  createSchool,
  deleteSchool,
  fetchBoards,
  fetchSchools,
  updateSchool,
  uploadFile,
} from "../api/authService";

const PAGE_SIZE = 10;

function extractSchools(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.schools)) return response.schools;
  if (Array.isArray(response?.data?.schools)) return response.data.schools;
  return [];
}

function extractBoards(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.boards)) return response.boards;
  if (Array.isArray(response?.educationBoards)) return response.educationBoards;
  if (Array.isArray(response?.data?.boards)) return response.data.boards;
  if (Array.isArray(response?.data?.educationBoards)) {
    return response.data.educationBoards;
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

function mapBoardOption(board) {
  return {
    id: safeId(board?.id ?? board?._id ?? board?.boardId),
    name: board?.name ?? board?.boardName ?? "Board",
  };
}

function mapSchoolRow(school, boardOptions = []) {
  const boardId = safeId(school?.boardId ?? school?.board?.id ?? school?.board?._id);
  const matchedBoard = boardOptions.find((board) => board.id === boardId);

  return {
    id: safeId(school?.id ?? school?._id ?? school?.schoolId),
    rowId:
      safeId(school?.id ?? school?._id ?? school?.schoolId ?? school?.schoolCode) ||
      crypto.randomUUID(),
    name: school?.schoolName ?? school?.name ?? "Not available",
    address: school?.address ?? "",
    boardId: boardId || safeId(matchedBoard?.id),
    boardName:
      school?.board?.name ??
      school?.boardName ??
      school?.board ??
      matchedBoard?.name ??
      "Not available",
    schoolCode: school?.schoolCode ?? school?.code ?? "",
    image: (() => {
      const raw = school?.image;
      if (Array.isArray(raw)) return raw[0] ?? "";
      if (typeof raw === "string" && raw) return raw;
      return (
        school?.schoolImage ??
        school?.imageUrl ??
        school?.logo ??
        school?.thumbnail ??
        ""
      );
    })(),
  };
}

function getSearchParams(searchTerm) {
  const value = searchTerm.trim();

  if (!value) return {};

  const looksLikeCode = /^[a-z]+\d+$/i.test(value);
  return looksLikeCode ? { schoolCode: value } : { schoolName: value };
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

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const BOARD_DROPDOWN_LIMIT = 10;

async function fetchAllBoardPages(query = "") {
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetchBoards({
      page,
      limit: BOARD_DROPDOWN_LIMIT,
      name: query || undefined,
    });
    const list = extractBoards(res);
    all = [...all, ...list];
    if (list.length < BOARD_DROPDOWN_LIMIT) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

function useBoardSearch() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback((query = "") => {
    setLoading(true);
    fetchAllBoardPages(query)
      .then((list) =>
        setBoards(
          list
            .map(mapBoardOption)
            .filter((board) => board.id)
            .map((board) => ({ value: board.id, label: board.name }))
        )
      )
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  }, []);

  return { boards, loading, search };
}

function BoardFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { boards, loading, search } = useBoardSearch();
  useOutsideClick(ref, () => {
    setOpen(false);
    setQuery("");
  });

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    search("");
  }, [search]);

  useEffect(() => {
    if (open) search(debouncedQuery);
  }, [debouncedQuery, open, search]);

  const allOption = { value: "", label: "All Board" };
  const options = [allOption, ...boards];
  const selectedLabel = value
    ? boards.find((b) => b.value === value)?.label || "Board selected"
    : "All Board";

  const handleOpen = () => {
    setOpen((v) => !v);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative w-full sm:w-[200px]" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="h-[40px] w-full flex items-center justify-between rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
      >
        <span className={value ? "text-[#20242a]" : "text-[#5b626a]"}>
          {loading && boards.length === 0 ? "Loading..." : selectedLabel}
        </span>
        {loading && boards.length === 0 ? (
          <Loader2 size={13} className="animate-spin text-[#6b7280] flex-shrink-0" />
        ) : (
          <ChevronDown
            size={16}
            className={`text-[#5b626a] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e7ecef] rounded-xl shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search board..."
                className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155966]/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <li className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              </li>
            ) : options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">
                No boards found
              </li>
            ) : (
              options.map((b) => (
                <li
                  key={b.value || "all"}
                  onClick={() => {
                    onChange(b.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`px-4 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5fafc] transition-colors
                    ${value === b.value ? "text-[#155966] font-medium" : "text-[#20242a]"}`}
                >
                  {b.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionMenu({ schoolName, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${schoolName}`}
      >
        <MoreHorizontal size={20} strokeWidth={2.2} />
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

function DeleteSchoolModal({ schoolName, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">Delete School</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{schoolName}</span>?
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

function ImagePreview({ src, schoolName }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src) return null;

  if (failed) {
    return (
      <div className="relative mt-4 flex h-28 w-36 items-center justify-center rounded-[14px] border border-[#dbe3e8] bg-[#f6f8fb] text-center text-sm text-[#3a3c42]">
        <button
          type="button"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#676a70] text-white"
          aria-label="Preview unavailable"
        >
          <X size={16} />
        </button>
        <div className="flex flex-col items-center gap-2 px-3">
          <ImageOff size={18} className="text-[#7b8794]" />
          <span>Unable to load</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 h-28 w-36 overflow-hidden rounded-[14px] border border-[#dbe3e8] bg-[#f6f8fb]">
      <img
        src={src}
        alt={schoolName ? `${schoolName} preview` : "School preview"}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function SchoolModal({
  initialData = null,
  boardOptions,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState({
    schoolName: initialData?.name ?? "",
    address: initialData?.address ?? "",
    schoolCode: initialData?.schoolCode ?? "",
    boardId: initialData?.boardId ?? "",
    schoolImage: typeof initialData?.image === "string" ? initialData.image : "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file);
      if (url) setForm((current) => ({ ...current, schoolImage: url }));
    } catch {
      setError("Image upload failed. You can paste a URL manually.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const setValue = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.schoolName.trim()) {
      setError("School name is required.");
      return;
    }

    if (!form.address.trim()) {
      setError("Address is required.");
      return;
    }

    if (!form.schoolCode.trim()) {
      setError("School code is required.");
      return;
    }

    if (!form.boardId) {
      setError("Board is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        schoolName: form.schoolName.trim(),
        address: form.address.trim(),
        schoolCode: form.schoolCode.trim(),
        boardId: Number(form.boardId),
        image: form.schoolImage.trim() ? [form.schoolImage.trim()] : [],
      };

      if (isEdit) {
        await updateSchool(initialData.id, payload);
      } else {
        await createSchool(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Failed to ${isEdit ? "update" : "create"} school`
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
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#20242a]">
              {isEdit ? "Edit School" : "Add School"}
            </h2>
            <p className="mt-2 text-sm text-[#5b626a]">
              {isEdit
                ? "Update the school details below and save your changes."
                : "Create a school record with the core details used across the dashboard."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-[#d7dde2] p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close school modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              School Name *
            </span>
            <input
              value={form.schoolName}
              onChange={setValue("schoolName")}
              disabled={saving}
              placeholder="Army Public School"
              className="h-12 w-full rounded-[14px] border border-[#c7cbd1] px-5 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Address *
            </span>
            <textarea
              value={form.address}
              onChange={setValue("address")}
              disabled={saving}
              rows={4}
              placeholder="Pangode, Thiruvananthapuram, Kerala 695006"
              className="w-full resize-none rounded-[14px] border border-[#c7cbd1] px-5 py-3 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              School Code *
            </span>
            <input
              value={form.schoolCode}
              onChange={setValue("schoolCode")}
              disabled={saving}
              placeholder="APS001"
              className="h-12 w-full rounded-[14px] border border-[#c7cbd1] px-5 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="relative block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Board *
            </span>
            <select
              value={form.boardId}
              onChange={setValue("boardId")}
              disabled={saving}
              className="h-12 w-full appearance-none rounded-[14px] border border-[#c7cbd1] bg-white px-5 pr-12 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            >
              <option value="">Select Board</option>
              {boardOptions.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-[46px] -translate-y-1/2 text-[#20242a]"
              size={18}
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              School Image
            </span>
            <div className="relative">
              <input
                value={form.schoolImage}
                onChange={setValue("schoolImage")}
                disabled={saving || uploading}
                placeholder="https://example.com/images/armyps.jpg"
                className="h-12 w-full rounded-[14px] border border-[#c7cbd1] px-5 pr-14 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving || uploading}
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#155966] transition hover:bg-[#e8f3f6] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Upload school image"
                title="Upload school image"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ImageIcon size={18} />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <ImagePreview src={form.schoolImage.trim()} schoolName={form.schoolName.trim()} />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-12 min-w-[150px] items-center justify-center rounded-[14px] border border-[#c7cbd1] px-6 text-[16px] font-medium text-[#155966] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-[14px] bg-[#155966] px-6 text-[16px] font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {saving ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [boardOptions, setBoardOptions] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: PAGE_SIZE,
    hasPrev: false,
    hasNext: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [boardId, setBoardId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [activeSchool, setActiveSchool] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      order: "desc",
      boardId: boardId || undefined,
      ...getSearchParams(searchTerm),
    }),
    [boardId, page, pageSize, searchTerm]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBoards() {
      try {
        const response = await fetchBoards();
        const mappedBoards = extractBoards(response).map(mapBoardOption);

        if (!cancelled) {
          setBoardOptions(mappedBoards.filter((board) => board.id));
        }
      } catch (err) {
        console.error("Failed to load boards for schools:", err);
        if (!cancelled) {
          setBoardOptions([]);
        }
      }
    }

    loadBoards();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadSchools() {
        try {
          setLoading(true);
          setError("");

          const response = await fetchSchools(queryParams);
          const mappedSchools = extractSchools(response).map((school) =>
            mapSchoolRow(school, boardOptions)
          );

          if (!cancelled) {
            setSchools(mappedSchools);
            setPagination(extractPagination(response, mappedSchools.length, pageSize));
          }
        } catch (err) {
          console.error("Error loading schools:", err);
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load schools";

          if (!cancelled) {
            setError(message);
            setSchools([]);
            setPagination(extractPagination(null, 0, pageSize));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      loadSchools();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [boardOptions, queryParams, refreshKey]);

  const totalSchools = pagination?.totalCount ?? schools.length;
  const startRow = totalSchools === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalSchools);

  function openAddModal() {
    setActiveSchool(null);
    setModalMode("add");
  }

  function openEditModal(school) {
    setActiveSchool(school);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setActiveSchool(null);
  }

  async function handleDeleteSchool() {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await deleteSchool(deleteTarget.id);
      setDeleteTarget(null);

      if (schools.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete school"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="ty-page-shell">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ty-page-title">
            Schools
          </h1>
          <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
            {totalSchools} Schools
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          Add School
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-[420px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={20}
            strokeWidth={2}
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Search schools by name, school code..."
            className="h-[40px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>

        <BoardFilter
          value={boardId}
          onChange={(nextId) => {
            setBoardId(nextId);
            setPage(1);
          }}
        />
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Schools
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
            <p className="mt-3">Loading schools...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && schools.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No schools found.
          </div>
        )}

        {!loading && !error && schools.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="bg-[#e9f2f5]">
                    <th className="rounded-l-2xl px-5 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      School Name
                    </th>
                    <th className="px-5 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Address
                    </th>
                    <th className="px-5 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Board
                    </th>
                    <th className="px-5 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      School Code
                    </th>
                    <th className="rounded-r-2xl px-5 py-4 text-right text-[16px] font-medium text-[#16191d]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr
                      key={school.rowId}
                      className="border-b border-[#eef0f2] last:border-b-0"
                    >
                      <td className="px-5 py-5 text-[15px] font-medium text-[#2a2d32]">
                        {school.name}
                      </td>
                      <td className="px-5 py-5 text-[15px] text-[#2a2d32]">
                        {school.address || "Not available"}
                      </td>
                      <td className="px-5 py-5 text-[15px] text-[#2a2d32]">
                        {school.boardName}
                      </td>
                      <td className="px-5 py-5 text-[15px] text-[#2a2d32]">
                        {school.schoolCode || "Not available"}
                      </td>
                      <td className="px-5 py-5 text-right">
                        <ActionMenu
                          schoolName={school.name}
                          onEdit={() => openEditModal(school)}
                          onDelete={() => setDeleteTarget(school)}
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
              rangeLabel={`${startRow}-${endRow} of ${totalSchools}`}
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
        <SchoolModal
          boardOptions={boardOptions}
          onClose={closeModal}
          onSuccess={() => {
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {modalMode === "edit" && activeSchool && (
        <SchoolModal
          initialData={activeSchool}
          boardOptions={boardOptions}
          onClose={closeModal}
          onSuccess={() => {
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteSchoolModal
          schoolName={deleteTarget.name}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleDeleteSchool}
        />
      )}
    </div>
  );
}
