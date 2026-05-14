import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
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
  createChapter,
  deleteChapter,
  fetchChapters,
  fetchTextbookById,
  updateChapter,
  uploadFile,
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
    const pageSize = Number(
      pagination.pageSize ?? pagination.limit ?? pagination.perPage ?? fallbackPageSize
    );
    const totalCount = Number(
      pagination.totalCount ?? pagination.total ?? pagination.count ?? fallbackCount
    );
    const totalPages = Number(
      pagination.totalPages ??
        pagination.pageCount ??
        (totalCount && pageSize ? Math.ceil(totalCount / pageSize) : 1)
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

function safeText(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function truncateText(value, maxLength = 28) {
  const text = safeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
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

function ActionMenu({ chapterTitle, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${chapterTitle}`}
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
          >
            <Pencil size={14} className="text-[#155966]" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onView(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
          >
            <Eye size={14} className="text-[#155966]" />
            View
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteChapterModal({ chapterTitle, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">Delete Chapter</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{chapterTitle}</span>?
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

function mapChapterRow(chapter, index, textbook) {
  const textbookTitle =
    chapter?.textbook?.title ??
    chapter?.textbookTitle ??
    textbook?.title ??
    textbook?.name ??
    "-";

  return {
    id: safeText(chapter?.id ?? chapter?._id ?? chapter?.code ?? index, String(index)),
    title: safeText(chapter?.title ?? chapter?.name, "Untitled Chapter"),
    subTitle: safeText(chapter?.subTitle ?? chapter?.subtitle ?? chapter?.sub_title),
    code: safeText(chapter?.code ?? chapter?.chapterCode),
    description: safeText(chapter?.description ?? chapter?.summary),
    textbook: safeText(textbookTitle),
    status: safeText(chapter?.status ?? chapter?.progressStatus ?? "Not Started"),
    images: Array.isArray(chapter?.images) ? chapter.images : [],
    textbookId: chapter?.textbookId ?? chapter?.textbook_id ?? textbook?.id ?? "",
  };
}

function ChapterEditModal({ chapter, textbookTitle, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: chapter.title === "-" ? "" : (chapter.title ?? ""),
    subTitle: chapter.subTitle === "-" ? "" : (chapter.subTitle ?? ""),
    description: chapter.description === "-" ? "" : (chapter.description ?? ""),
    images: chapter.images ?? [],
    status: chapter.status ?? "Not Started",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving && !uploading) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving, uploading]);

  async function handleImageChange(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    try {
      setUploading(true);
      setError("");
      const urls = await Promise.all(files.map((file) => uploadFile(file)));
      setForm((current) => ({
        ...current,
        images: [...current.images, ...urls.filter(Boolean)],
      }));
    } catch {
      setError("Failed to upload image(s).");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      subTitle: form.subTitle.trim(),
      textbookId: Number(chapter.textbookId),
      description: form.description.trim(),
      images: form.images,
      status: form.status,
    };
    try {
      setSaving(true);
      setError("");
      await updateChapter(chapter.id, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update chapter"
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[20px] bg-white px-8 py-8 shadow-xl"
      >
        <h2 className="mb-6 text-center text-[24px] font-bold text-[#20242a]">
          Edit Chapter
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Title</p>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              disabled={busy}
              placeholder="Chapter title"
              className="h-12 w-full rounded-[10px] border border-[#c7cbd1] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Sub Title</p>
            <input
              value={form.subTitle}
              onChange={(e) => setForm((f) => ({ ...f, subTitle: e.target.value }))}
              disabled={busy}
              placeholder="Sub title"
              className="h-12 w-full rounded-[10px] border border-[#c7cbd1] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Textbook</p>
            <div className="flex h-12 items-center rounded-[10px] border border-[#c7cbd1] bg-[#f4f6f8] px-4 text-sm text-[#5b626a]">
              {textbookTitle}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Description</p>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={busy}
              rows={4}
              placeholder="Description for the chapter"
              className="w-full resize-none rounded-[10px] border border-[#c7cbd1] px-4 py-3 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <div
              className="relative flex h-12 cursor-pointer items-center rounded-[10px] border border-[#c7cbd1] px-4"
              onClick={() => !busy && fileInputRef.current?.click()}
            >
              <span className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-[#5b626a]">
                Images
              </span>
              <span className="flex-1 text-sm text-[#5b626a]">
                {uploading
                  ? "Uploading..."
                  : form.images.length > 0
                  ? `${form.images.length} selected`
                  : "Select images"}
              </span>
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              ) : (
                <Copy size={16} className="text-[#5b626a]" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            {form.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.images.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-[#c7cbd1] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Status</p>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                disabled={busy}
                className="h-12 w-full appearance-none rounded-[10px] border border-[#c7cbd1] bg-white px-4 pr-10 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
              >
                <option value="">Select status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5b626a]"
                size={16}
                strokeWidth={2}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-[10px] border border-[#c7cbd1] py-3 text-sm font-semibold text-[#20242a] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#155966] py-3 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddChapterModal({ textbook, textbookId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    subTitle: "",
    description: "",
    images: [],
    status: "Not Started",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving && !uploading) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving, uploading]);

  async function handleImageChange(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      setUploading(true);
      setError("");
      const urls = await Promise.all(files.map((file) => uploadFile(file)));
      setForm((current) => ({
        ...current,
        images: [...current.images, ...urls.filter(Boolean)],
      }));
    } catch {
      setError("Failed to upload image(s).");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!textbook?.id && !textbookId) {
      setError("Textbook is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createChapter({
        title: form.title.trim(),
        subTitle: form.subTitle.trim(),
        textbookId: Number(textbook?.id ?? textbookId),
        description: form.description.trim(),
        images: form.images,
        status: form.status,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to add chapter"
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploading;
  const textbookTitle = textbook?.title ?? textbook?.name ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[20px] bg-white px-6 py-7 shadow-xl sm:px-8"
      >
        <h2 className="mb-6 text-center text-[24px] font-bold text-[#20242a]">
          Add Chapter
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Title
            </span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              disabled={busy}
              placeholder="Enter chapter title"
              className="h-12 w-full rounded-[10px] border border-[#b9bec5] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Sub Title
            </span>
            <input
              value={form.subTitle}
              onChange={(event) =>
                setForm((current) => ({ ...current, subTitle: event.target.value }))
              }
              disabled={busy}
              placeholder="Enter chapter sub title"
              className="h-12 w-full rounded-[10px] border border-[#b9bec5] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Textbook
            </span>
            <div className="flex h-12 items-center rounded-[10px] border border-[#b9bec5] bg-[#fbfcfd] px-4 text-sm text-[#4a5157]">
              {textbookTitle}
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              disabled={busy}
              rows={4}
              placeholder="Enter chapter description"
              className="w-full resize-none rounded-[10px] border border-[#b9bec5] px-4 py-3 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <div>
            <div
              className="flex h-11 cursor-pointer items-center justify-between rounded-[10px] border border-[#b9bec5] px-4"
              onClick={() => !busy && fileInputRef.current?.click()}
            >
              <span className="text-sm text-[#777f87]">
                {uploading
                  ? "Uploading..."
                  : form.images.length > 0
                    ? `${form.images.length} image(s) selected`
                    : "Images"}
              </span>
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              ) : (
                <Copy size={16} className="text-[#5b626a]" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            {form.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.images.map((url, index) => (
                  <div key={url + index} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-[#c7cbd1] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Status
            </span>
            <div className="relative">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                disabled={busy}
                className="h-12 w-full appearance-none rounded-[10px] border border-[#b9bec5] bg-white px-4 pr-10 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5b626a]"
              />
            </div>
          </label>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-[10px] border border-[#c7cbd1] py-3 text-sm font-medium text-[#5b626a] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#155966] py-3 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Adding..." : "Add Chapter"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChaptersPage() {
  const { textbookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const textbookFromState = location.state?.textbook ?? null;

  const [textbook, setTextbook] = useState(textbookFromState);
  const [chapters, setChapters] = useState([]);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChapter, setActiveChapter] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (textbook || !textbookId) return;

    let cancelled = false;

    async function loadTextbook() {
      try {
        const response = await fetchTextbookById(textbookId);
        const textbookData = response?.data ?? response?.textbook ?? response;

        if (!cancelled) {
          setTextbook(textbookData);
        }
      } catch (err) {
        console.error("Failed to load textbook details:", err);
      }
    }

    loadTextbook();
    return () => {
      cancelled = true;
    };
  }, [textbook, textbookId]);

  useEffect(() => {
    let cancelled = false;

    async function loadChapters() {
      if (!textbookId) {
        setError("Textbook id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetchChapters({
          page,
          limit: pageSize,
          textbookId,
        });
        const list = extractList(response, ["chapters"]).map((chapter, index) =>
          mapChapterRow(chapter, index, textbook)
        );

        if (!cancelled) {
          setChapters(list);
          setPagination(extractPagination(response, list.length, pageSize));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Failed to load chapters"
          );
          setChapters([]);
          setPagination(extractPagination(null, 0, pageSize));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadChapters();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, textbook, textbookId, refreshKey]);

  const filteredChapters = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return chapters;

    return chapters.filter((chapter) =>
      [
        chapter.title,
        chapter.subTitle,
        chapter.code,
        chapter.description,
        chapter.textbook,
        chapter.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [chapters, search]);

  const totalChapters =
    search.trim() && filteredChapters.length !== chapters.length
      ? filteredChapters.length
      : (pagination?.totalCount ?? chapters.length);
  const rowsToShow = search.trim() ? filteredChapters : chapters;
  const startRow = totalChapters === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalChapters);
  const title = textbook?.title ?? textbook?.name ?? "Textbook";
  const code = textbook?.code ? ` - ${textbook.code}` : "";

  function openTopicsPage(chapter) {
    navigate(`/syllabus/${textbookId}/chapters/${chapter.id}/topics`, {
      state: { chapter, textbook },
    });
  }

  function openEditModal(chapter) {
    setActiveChapter(chapter);
  }

  function closeEditModal() {
    setActiveChapter(null);
  }

  async function handleDeleteChapter() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");
      await deleteChapter(deleteTarget.id);
      setDeleteTarget(null);

      if (chapters.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete chapter"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#edf6f8] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/syllabus")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#20242a] transition hover:bg-white"
              aria-label="Back to syllabus"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="ty-page-title">
              Chapters
            </h1>
          </div>
          <p className="mt-2 pl-12 ty-subtitle">
            {title}
            {code}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={20} strokeWidth={2.2} />
          Add Chapter
        </button>
      </div>

      <div className="mb-6 rounded-[14px] bg-white px-4 py-4 sm:px-5">
        <label className="relative block w-full">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={20}
            strokeWidth={2}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chapters by title..."
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>
      </div>

      <section className="rounded-[14px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 ty-section-heading">
          Chapters List
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
            <p className="mt-3">Loading chapters...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && rowsToShow.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No chapters found.
          </div>
        )}

        {!loading && !error && rowsToShow.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead>
                  <tr className="border-b border-[#edf0f2]">
                    <th className="px-3 py-4 text-left ty-table-header">
                      Title
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Sub Title
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Code
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Description
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Textbook
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Status
                    </th>
                    <th className="px-3 py-4 text-right ty-table-header">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsToShow.map((chapter) => (
                    <tr
                      key={chapter.id}
                      className="border-b border-[#eef0f2] last:border-b-0"
                    >
                      <td className="px-3 py-4 ty-table-cell-primary">
                        {truncateText(chapter.title, 24)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(chapter.subTitle, 26)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(chapter.code, 16)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(chapter.description, 28)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(chapter.textbook, 24)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {chapter.status}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <ActionMenu
                          chapterTitle={chapter.title}
                          onEdit={() => openEditModal(chapter)}
                          onView={() => openTopicsPage(chapter)}
                          onDelete={() => setDeleteTarget(chapter)}
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
              rangeLabel={`${startRow}-${endRow} of ${totalChapters}`}
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

      {activeChapter && (
        <ChapterEditModal
          chapter={activeChapter}
          textbookTitle={textbook?.title ?? textbook?.name ?? ""}
          onClose={closeEditModal}
          onSuccess={() => setRefreshKey((v) => v + 1)}
        />
      )}

      {showAddModal && (
        <AddChapterModal
          textbook={textbook}
          textbookId={textbookId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteChapterModal
          chapterTitle={deleteTarget.title}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteChapter}
        />
      )}
    </div>
  );
}
