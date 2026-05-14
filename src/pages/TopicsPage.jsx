import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import {
  createTopic,
  deleteTopic,
  fetchTopics,
  updateTopic,
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

function truncateText(value, maxLength = 30) {
  const text = safeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function mapTopicRow(topic, index, chapter) {
  const chapterTitle =
    topic?.chapter?.title ??
    topic?.chapterTitle ??
    chapter?.title ??
    chapter?.name ??
    "-";

  return {
    id: safeText(topic?.id ?? topic?._id ?? topic?.code ?? index, String(index)),
    title: safeText(topic?.title ?? topic?.name, "Untitled Topic"),
    description: safeText(topic?.description ?? topic?.summary),
    chapter: safeText(chapterTitle),
    status: safeText(topic?.status ?? topic?.progressStatus ?? "Not Started"),
    imageUrl: safeText(
      topic?.imageUrl ?? topic?.imageURL ?? topic?.image ?? topic?.thumbnailUrl
    ),
    images: Array.isArray(topic?.images) ? topic.images : [],
    media: Array.isArray(topic?.media) ? topic.media : [],
    chapterId: topic?.chapterId ?? topic?.chapter_id ?? chapter?.id ?? "",
    isActive: topic?.isActive ?? true,
    concept: topic?.concept ?? "",
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

function ActionMenu({ topicTitle, onEdit, onView, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${topicTitle}`}
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

function DeleteTopicModal({ topicTitle, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">Delete Topic</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{topicTitle}</span>?
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

function TopicEditModal({ topic, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: topic.title === "-" ? "" : (topic.title ?? ""),
    description: topic.description === "-" ? "" : (topic.description ?? ""),
    images: topic.images ?? [],
    media: topic.media ?? [],
    status: topic.status ?? "Not Started",
    isActive: topic.isActive ?? true,
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving && !uploadingImages && !uploadingVideos) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving, uploadingImages, uploadingVideos]);

  async function handleImageChange(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    try {
      setUploadingImages(true);
      setError("");
      const urls = await Promise.all(files.map((file) => uploadFile(file)));
      setForm((f) => ({ ...f, images: [...f.images, ...urls.filter(Boolean)] }));
    } catch {
      setError("Failed to upload image(s).");
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  }

  async function handleVideoChange(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    try {
      setUploadingVideos(true);
      setError("");
      const urls = await Promise.all(files.map((file) => uploadFile(file)));
      setForm((f) => ({ ...f, media: [...f.media, ...urls.filter(Boolean)] }));
    } catch {
      setError("Failed to upload video(s).");
    } finally {
      setUploadingVideos(false);
      event.target.value = "";
    }
  }

  function removeImage(index) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  function removeVideo(index) {
    setForm((f) => ({ ...f, media: f.media.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      chapterId: Number(topic.chapterId),
      images: form.images,
      media: form.media,
      status: form.status,
      isActive: form.isActive,
    };
    try {
      setSaving(true);
      setError("");
      await updateTopic(topic.id, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update topic"
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploadingImages || uploadingVideos;

  function getFileName(url) {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]) || url;
    } catch {
      return url;
    }
  }

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
          Edit Topic
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
              placeholder="Topic title"
              className="h-12 w-full rounded-[10px] border border-[#c7cbd1] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Description</p>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={busy}
              rows={4}
              placeholder="Description for the topic"
              className="w-full resize-none rounded-[10px] border border-[#c7cbd1] px-4 py-3 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Chapter ID</p>
            <div className="flex h-12 items-center rounded-[10px] border border-[#c7cbd1] bg-[#f4f6f8] px-4 text-sm text-[#5b626a]">
              {topic.chapterId}
            </div>
          </div>

          <div>
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

          {/* Images */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Images</p>
            <div
              className="flex h-12 cursor-pointer items-center justify-between rounded-[10px] border border-[#c7cbd1] px-4"
              onClick={() => !busy && imageInputRef.current?.click()}
            >
              <span className="text-sm text-[#5b626a]">
                {uploadingImages
                  ? "Uploading..."
                  : form.images.length > 0
                  ? `${form.images.length} selected`
                  : "Select images"}
              </span>
              {uploadingImages ? (
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              ) : (
                <Upload size={16} className="text-[#5b626a]" />
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            {form.images.length > 0 && (
              <>
                <p className="mb-2 mt-3 text-sm font-medium text-[#20242a]">
                  Selected Images
                </p>
                <div className="flex flex-wrap gap-2">
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
              </>
            )}
          </div>

          {/* Videos */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-[#20242a]">Videos</p>
            <div
              className="flex h-12 cursor-pointer items-center justify-between rounded-[10px] border border-[#c7cbd1] px-4"
              onClick={() => !busy && videoInputRef.current?.click()}
            >
              <span className="text-sm text-[#5b626a]">
                {uploadingVideos
                  ? "Uploading..."
                  : form.media.length > 0
                  ? `${form.media.length} selected`
                  : "Select videos"}
              </span>
              {uploadingVideos ? (
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              ) : (
                <Upload size={16} className="text-[#5b626a]" />
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={handleVideoChange}
            />
            {form.media.length > 0 && (
              <>
                <p className="mb-2 mt-3 text-sm font-medium text-[#20242a]">
                  Selected Videos
                </p>
                <div className="flex flex-col gap-2">
                  {form.media.map((url, index) => (
                    <div
                      key={index}
                      className="relative flex items-center gap-3 rounded-[10px] border border-[#c7cbd1] px-3 py-2"
                    >
                      <PlayCircle size={32} className="shrink-0 text-[#155966]" />
                      <span className="flex-1 truncate text-xs text-[#5b626a]">
                        {truncateText(getFileName(url), 30)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
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

function AddTopicModal({ chapter, chapterId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    images: [],
    media: [],
    status: "Not Started",
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving && !uploadingImages && !uploadingVideos) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving, uploadingImages, uploadingVideos]);

  async function handleImageChange(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      setUploadingImages(true);
      setError("");
      const urls = await Promise.all(files.map((file) => uploadFile(file)));
      setForm((current) => ({
        ...current,
        images: [...current.images, ...urls.filter(Boolean)],
      }));
    } catch {
      setError("Failed to upload image(s).");
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  }

  async function handleVideoChange(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      setUploadingVideos(true);
      setError("");
      const urls = await Promise.all(files.map((file) => uploadFile(file)));
      setForm((current) => ({
        ...current,
        media: [...current.media, ...urls.filter(Boolean)],
      }));
    } catch {
      setError("Failed to upload video(s).");
    } finally {
      setUploadingVideos(false);
      event.target.value = "";
    }
  }

  function removeImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  function removeVideo(index) {
    setForm((current) => ({
      ...current,
      media: current.media.filter((_, mediaIndex) => mediaIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!chapter?.id && !chapterId) {
      setError("Chapter id is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createTopic({
        title: form.title.trim(),
        description: form.description.trim(),
        chapterId: Number(chapter?.id ?? chapterId),
        images: form.images,
        media: form.media,
        status: form.status,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to add topic"
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploadingImages || uploadingVideos;

  function getFileName(url) {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]) || url;
    } catch {
      return url;
    }
  }

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
          Add Topic
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
              placeholder="Enter topic title"
              className="h-12 w-full rounded-[10px] border border-[#b9bec5] px-4 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
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
              placeholder="Enter topic description"
              className="w-full resize-none rounded-[10px] border border-[#b9bec5] px-4 py-3 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Chapter ID
            </span>
            <div className="flex h-12 items-center rounded-[10px] border border-[#b9bec5] bg-[#fbfcfd] px-4 text-sm text-[#4a5157]">
              {chapter?.id ?? chapterId ?? ""}
            </div>
          </label>

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

          <div>
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Images
            </span>
            <div
              className="flex h-11 cursor-pointer items-center justify-between rounded-[10px] border border-[#b9bec5] px-4"
              onClick={() => !busy && imageInputRef.current?.click()}
            >
              <span className="text-sm text-[#777f87]">
                {uploadingImages
                  ? "Uploading..."
                  : form.images.length > 0
                    ? `${form.images.length} image(s) selected`
                    : "Upload image(s)"}
              </span>
              {uploadingImages ? (
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              ) : (
                <Upload size={16} className="text-[#5b626a]" />
              )}
            </div>
            <input
              ref={imageInputRef}
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

          <div>
            <span className="mb-2 block text-sm font-medium text-[#20242a]">
              Videos
            </span>
            <div
              className="flex h-11 cursor-pointer items-center justify-between rounded-[10px] border border-[#b9bec5] px-4"
              onClick={() => !busy && videoInputRef.current?.click()}
            >
              <span className="text-sm text-[#777f87]">
                {uploadingVideos
                  ? "Uploading..."
                  : form.media.length > 0
                    ? `${form.media.length} video(s) selected`
                    : "Upload video(s)"}
              </span>
              {uploadingVideos ? (
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              ) : (
                <Upload size={16} className="text-[#5b626a]" />
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={handleVideoChange}
            />
            {form.media.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {form.media.map((url, index) => (
                  <div
                    key={url + index}
                    className="relative flex items-center gap-3 rounded-[10px] border border-[#c7cbd1] px-3 py-2"
                  >
                    <PlayCircle size={32} className="shrink-0 text-[#155966]" />
                    <span className="flex-1 truncate text-xs text-[#5b626a]">
                      {truncateText(getFileName(url), 30)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TopicsPage() {
  const { textbookId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const chapter = location.state?.chapter ?? null;

  const [topics, setTopics] = useState([]);
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
  const [activeTopic, setActiveTopic] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTopics() {
      if (!chapterId) {
        setError("Chapter id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetchTopics({
          page,
          limit: pageSize,
          chapterId,
        });
        const list = extractList(response, ["topics"]).map((topic, index) =>
          mapTopicRow(topic, index, chapter)
        );

        if (!cancelled) {
          setTopics(list);
          setPagination(extractPagination(response, list.length, pageSize));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Failed to load topics"
          );
          setTopics([]);
          setPagination(extractPagination(null, 0, pageSize));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTopics();
    return () => {
      cancelled = true;
    };
  }, [chapter, chapterId, page, pageSize, refreshKey]);

  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return topics;

    return topics.filter((topic) =>
      [
        topic.title,
        topic.description,
        topic.chapter,
        topic.status,
        topic.imageUrl,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, topics]);

  const totalTopics =
    search.trim() && filteredTopics.length !== topics.length
      ? filteredTopics.length
      : (pagination?.totalCount ?? topics.length);
  const rowsToShow = search.trim() ? filteredTopics : topics;
  const startRow = totalTopics === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalTopics);
  const title = chapter?.title ?? chapter?.name ?? "Chapter";
  const code = chapter?.code ? ` - ${chapter.code}` : "";

  async function handleDeleteTopic() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");
      await deleteTopic(deleteTarget.id);
      setDeleteTarget(null);

      if (topics.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete topic"
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
              onClick={() => navigate(`/syllabus/${textbookId}/chapters`)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#20242a] transition hover:bg-white"
              aria-label="Back to chapters"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="ty-page-title">
              Topics
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
          Add Topic
        </button>
      </div>

      <div className="mb-6 rounded-[14px] bg-white px-4 py-4 sm:px-5">
        <label className="relative block w-full max-w-[368px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={19}
            strokeWidth={2}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="h-[38px] w-full rounded-[18px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>
      </div>

      <section className="rounded-[14px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 ty-section-heading">
          Topics List
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
            <p className="mt-3">Loading topics...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && rowsToShow.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No topics found.
          </div>
        )}

        {!loading && !error && rowsToShow.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-[#edf0f2]">
                    <th className="px-3 py-4 text-left ty-table-header">
                      Title
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Description
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Chapter
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Status
                    </th>
                    <th className="px-3 py-4 text-left ty-table-header">
                      Image URL
                    </th>
                    <th className="px-3 py-4 text-right ty-table-header">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsToShow.map((topic) => (
                    <tr
                      key={topic.id}
                      className="border-b border-[#eef0f2] last:border-b-0"
                    >
                      <td className="px-3 py-4 ty-table-cell-primary">
                        {truncateText(topic.title, 24)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(topic.description, 34)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(topic.chapter, 24)}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {topic.status}
                      </td>
                      <td className="px-3 py-4 ty-table-cell">
                        {truncateText(topic.imageUrl, 28)}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <ActionMenu
                          topicTitle={topic.title}
                          onEdit={() => setActiveTopic(topic)}
                          onView={() =>
                            navigate(
                              `/syllabus/${textbookId}/chapters/${chapterId}/topics/${topic.id}`,
                              { state: { topic, chapter, textbook: location.state?.textbook } }
                            )
                          }
                          onDelete={() => setDeleteTarget(topic)}
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
              rangeLabel={`${startRow}-${endRow} of ${totalTopics}`}
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

      {activeTopic && (
        <TopicEditModal
          topic={activeTopic}
          onClose={() => setActiveTopic(null)}
          onSuccess={() => setRefreshKey((v) => v + 1)}
        />
      )}

      {showAddModal && (
        <AddTopicModal
          chapter={chapter}
          chapterId={chapterId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteTopicModal
          topicTitle={deleteTarget.title}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteTopic}
        />
      )}
    </div>
  );
}
