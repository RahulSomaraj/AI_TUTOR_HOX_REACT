import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Eye,
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
  createTextbook,
  deleteTextbook,
  fetchSubjects,
  fetchTextbooks,
  updateTextbook,
} from "../api/authService";

const PAGE_SIZE = 10;

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

function getSubjectName(subject) {
  return subject?.name ?? subject?.subjectName ?? subject?.title ?? "Subject";
}

function mapSubjectOption(subject) {
  return {
    id: safeId(subject?.id ?? subject?._id ?? subject?.uuid),
    name: getSubjectName(subject),
    code: subject?.code ?? "-",
  };
}

function mapTextbookRow(textbook, index, subjectOptions) {
  const subjectId = safeId(textbook?.subjectId ?? textbook?.subject?.id);
  const matchedSubject = subjectOptions.find((subject) => subject.id === subjectId);

  return {
    id: safeId(textbook?.id ?? textbook?._id ?? textbook?.code ?? index),
    title: textbook?.title ?? textbook?.name ?? "Untitled Textbook",
    code: textbook?.code ?? "-",
    source: textbook?.source ?? "-",
    subjectId,
    subjectName: textbook?.subject?.name ?? matchedSubject?.name ?? "-",
    subjectCode: textbook?.subject?.code ?? matchedSubject?.code ?? "-",
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

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const SUBJECT_DROPDOWN_LIMIT = 10;

async function fetchAllSubjectPages(query = "") {
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetchSubjects({
      page,
      limit: SUBJECT_DROPDOWN_LIMIT,
      order: "asc",
      name: query || undefined,
    });
    const list = extractList(res, ["subjects"]);
    all = [...all, ...list];
    if (list.length < SUBJECT_DROPDOWN_LIMIT) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

function useSubjectSearch() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback((query = "") => {
    setLoading(true);
    fetchAllSubjectPages(query)
      .then((list) =>
        setSubjects(
          list
            .map(mapSubjectOption)
            .filter((s) => s.id)
            .map((s) => ({ value: String(s.id), label: s.name }))
        )
      )
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, []);

  return { subjects, loading, search };
}

function SubjectFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { subjects, loading, search } = useSubjectSearch();
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

  const allOption = { value: "", label: "All Subjects" };
  const options = [allOption, ...subjects];
  const selectedLabel = value
    ? subjects.find((s) => s.value === String(value))?.label || "Subject selected"
    : "All Subjects";

  const handleOpen = () => {
    setOpen((v) => !v);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative w-full sm:w-[240px]" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="h-[40px] w-full flex items-center justify-between rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
      >
        <span className={value ? "text-[#20242a]" : "text-[#5b626a]"}>
          {loading && subjects.length === 0 ? "Loading..." : selectedLabel}
        </span>
        {loading && subjects.length === 0 ? (
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
                placeholder="Search subject..."
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
                No subjects found
              </li>
            ) : (
              options.map((s) => (
                <li
                  key={s.value || "all"}
                  onClick={() => {
                    onChange(s.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`px-4 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5fafc] transition-colors
                    ${String(value) === s.value ? "text-[#155966] font-medium" : "text-[#20242a]"}`}
                >
                  {s.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionMenu({ textbookTitle, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${textbookTitle}`}
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
          >
            <Eye size={14} className="text-[#155966]" />
            View
          </button>
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

function TextbookModal({ initialData = null, subjects, onClose, onSuccess }) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState({
    title: initialData?.title ?? "",
    code: initialData?.code ?? "",
    source: initialData?.source ?? "",
    subjectId: initialData?.subjectId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    if (!form.title.trim()) {
      setError("Syllabus title is required.");
      return;
    }

    if (!isEdit && !form.code.trim()) {
      setError("Syllabus code is required.");
      return;
    }

    if (!form.source.trim()) {
      setError("Source is required.");
      return;
    }

    if (!isEdit && !form.subjectId) {
      setError("Subject is required.");
      return;
    }

    const payload = isEdit
      ? {
          title: form.title.trim(),
          source: form.source.trim().toUpperCase(),
          subjectId: Number(initialData.subjectId),
        }
      : {
          title: form.title.trim(),
          code: form.code.trim(),
          source: form.source.trim().toUpperCase(),
          subjectId: Number(form.subjectId),
        };

    try {
      setSaving(true);
      setError("");

      if (isEdit) {
        await updateTextbook(initialData.id, payload);
      } else {
        await createTextbook(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Failed to ${isEdit ? "update" : "create"} syllabus`
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
        className="w-full max-w-md rounded-[20px] bg-white px-8 py-8 shadow-xl"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-[#20242a]">
          {isEdit ? "Edit Textbook" : "Add Textbook"}
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {isEdit ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-[#20242a]">Subject Code</p>
              <div className="rounded-[10px] border border-[#c7cbd1] bg-[#f4f6f8] px-4 py-3 text-sm font-mono text-[#5b626a]">
                {form.code}
              </div>
            </div>
          ) : (
            <input
              value={form.code}
              onChange={setValue("code")}
              disabled={saving}
              placeholder="TB-MAT-NCE-001"
              className="h-12 w-full rounded-[10px] border border-[#c7cbd1] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Title</p>
            <input
              value={form.title}
              onChange={setValue("title")}
              disabled={saving}
              placeholder="Mathematics Part 1"
              className="h-12 w-full rounded-[10px] border border-[#c7cbd1] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Source</p>
            <input
              value={form.source}
              onChange={setValue("source")}
              disabled={saving}
              placeholder="NCERT"
              className="h-12 w-full rounded-[10px] border border-[#c7cbd1] px-4 text-sm uppercase text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          {!isEdit && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-[#20242a]">Subject</p>
              <div className="relative">
                <select
                  value={form.subjectId}
                  onChange={setValue("subjectId")}
                  disabled={saving}
                  className="h-12 w-full appearance-none rounded-[10px] border border-[#c7cbd1] bg-white px-4 pr-10 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5b626a]"
                  size={16}
                  strokeWidth={2}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-[10px] border border-[#c7cbd1] py-3 text-sm font-semibold text-[#20242a] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#155966] py-3 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving
              ? isEdit ? "Saving..." : "Adding..."
              : isEdit ? "Update" : "Add Textbook"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteTextbookModal({ textbookTitle, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">Delete Syllabus</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{textbookTitle}</span>?
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

export default function TextbooksPage() {
  const navigate = useNavigate();
  const [textbooks, setTextbooks] = useState([]);
  const [subjects, setSubjects] = useState([]);
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
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [activeTextbook, setActiveTextbook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSubjectOptions() {
      try {
        setLoadingSubjects(true);
        const response = await fetchSubjects({
          page: 1,
          limit: 50,
          order: "asc",
        });
        const options = extractList(response, ["subjects"]).map(mapSubjectOption);

        if (!cancelled) {
          setSubjects(options.filter((subject) => subject.id));
        }
      } catch (err) {
        console.error("Failed to load syllabus subjects:", err);
      } finally {
        if (!cancelled) {
          setLoadingSubjects(false);
        }
      }
    }

    loadSubjectOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetchTextbooks({
          page,
          limit: pageSize,
          subjectId: selectedSubjectId || undefined,
          source: search.trim() || undefined,
        });

        const list = extractList(response, ["textbooks"]).map((textbook, index) =>
          mapTextbookRow(textbook, index, subjects)
        );

        if (!cancelled) {
          setTextbooks(list);
          setPagination(extractPagination(response, list.length, pageSize));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
              err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Failed to load syllabus"
          );
          setTextbooks([]);
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
  }, [page, pageSize, refreshKey, search, selectedSubjectId, subjects]);

  const filteredTextbooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return textbooks;

    return textbooks.filter((textbook) =>
      [
        textbook.title,
        textbook.code,
        textbook.source,
        textbook.subjectName,
        textbook.subjectCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, textbooks]);

  const totalTextbooks =
    search.trim() && filteredTextbooks.length !== textbooks.length
      ? filteredTextbooks.length
      : (pagination?.totalCount ?? textbooks.length);

  function openAddModal() {
    setActiveTextbook(null);
    setModalMode("add");
  }

  function openEditModal(textbook) {
    setActiveTextbook(textbook);
    setModalMode("edit");
  }

  function openChaptersPage(textbook) {
    navigate(`/syllabus/${textbook.id}/chapters`, {
      state: { textbook },
    });
  }

  function closeModal() {
    setModalMode(null);
    setActiveTextbook(null);
  }

  async function handleDeleteTextbook() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteTextbook(deleteTarget.id);
      setDeleteTarget(null);

      if (textbooks.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete syllabus"
      );
    } finally {
      setDeleting(false);
    }
  }

  const startRow = totalTextbooks === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalTextbooks);
  const rowsToShow = search.trim() ? filteredTextbooks : textbooks;

  return (
    <div className="ty-page-shell">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ty-page-title">
            Syllabus
          </h1>
          <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
            {totalTextbooks} Syllabus
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          Add Syllabus
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
            placeholder="Search syllabus by source..."
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>

        <SubjectFilter
          value={selectedSubjectId}
          onChange={(nextId) => {
            setSelectedSubjectId(nextId);
            setPage(1);
          }}
        />
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Syllabus List
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
            <p className="mt-3">Loading syllabus...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && rowsToShow.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No syllabus found.
          </div>
        )}

        {!loading && !error && rowsToShow.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead>
                  <tr className="border-b border-[#edf0f2]">
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Title
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Code
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Source
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Subject
                    </th>
                    <th className="px-3 py-4 text-left text-[16px] font-medium text-[#16191d]">
                      Subject Code
                    </th>
                    <th className="px-3 py-4 text-right text-[16px] font-medium text-[#16191d]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsToShow.map((textbook) => (
                    <tr
                      key={textbook.id}
                      className="border-b border-[#eef0f2] last:border-b-0"
                    >
                      <td className="px-3 py-5 text-[15px] font-medium text-[#2a2d32]">
                        {textbook.title}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {textbook.code}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {textbook.source}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {textbook.subjectName}
                      </td>
                      <td className="px-3 py-5 text-[15px] text-[#2a2d32]">
                        {textbook.subjectCode}
                      </td>
                      <td className="px-3 py-5 text-right">
                        <ActionMenu
                          textbookTitle={textbook.title}
                          onView={() => openChaptersPage(textbook)}
                          onEdit={() => openEditModal(textbook)}
                          onDelete={() => setDeleteTarget(textbook)}
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
              rangeLabel={`${startRow}-${endRow} of ${totalTextbooks}`}
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
        <TextbookModal
          subjects={subjects}
          onClose={closeModal}
          onSuccess={() => {
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {modalMode === "edit" && activeTextbook && (
        <TextbookModal
          initialData={activeTextbook}
          subjects={subjects}
          onClose={closeModal}
          onSuccess={() => {
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteTextbookModal
          textbookTitle={deleteTarget.title}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleDeleteTextbook}
        />
      )}
    </div>
  );
}
