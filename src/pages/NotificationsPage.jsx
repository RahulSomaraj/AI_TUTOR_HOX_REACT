import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import { fetchNotifications, sendNotification, uploadFile } from "../api/authService";

const CATEGORY_OPTIONS = [
  "Announcements",
  "Promotions",
  "Alerts",
  "Updates",
  "Reminders",
];

const INITIAL_FORM = {
  title: "",
  message: "",
  imageUrl: "",
  category: "Announcements",
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function buildNotificationPayload(form) {
  const categoryValue = form.category.toLowerCase();
  const payload = {
    title: form.title.trim(),
    body: form.message.trim(),
    targetType: "ALL",
    priority: "HIGH",
    category: "notifications",
    data: {
      type: categoryValue,
      screen: "notifications",
    },
  };

  if (form.imageUrl.trim()) {
    payload.media = {
      type: "IMAGE",
      url: form.imageUrl.trim(),
    };
  }

  return payload;
}

function getNotificationList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.notifications)) return response.data.notifications;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.notifications)) return response.notifications;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function getPagination(response, fallbackCount = 0, fallbackPageSize = DEFAULT_PAGE_SIZE) {
  const pagination =
    response?.pagination ??
    response?.data?.pagination ??
    response?.meta ??
    response?.data?.meta ??
    null;

  if (!pagination) {
    return {
      currentPage: 1,
      totalPages: 1,
      totalCount: fallbackCount,
      pageSize: fallbackPageSize,
      hasPrev: false,
      hasNext: false,
    };
  }

  const totalCount = Number(
    pagination.totalCount ?? pagination.total ?? pagination.count ?? fallbackCount
  );
  const pageSize = Number(
    pagination.pageSize ?? pagination.limit ?? pagination.perPage ?? fallbackPageSize
  );
  const currentPage = Number(
    pagination.currentPage ?? pagination.page ?? pagination.pageNumber ?? 1
  );
  const totalPages = Number(
    pagination.totalPages ??
      pagination.pageCount ??
      (totalCount && pageSize ? Math.ceil(totalCount / pageSize) : 1)
  );

  return {
    currentPage,
    totalPages: Math.max(totalPages, 1),
    totalCount,
    pageSize,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

function formatNotificationCategory(notification) {
  const dataType = notification?.data?.type;
  const category = dataType || notification?.category || "notifications";

  return String(category)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeNotification(notification, index) {
  const mediaUrl =
    notification?.media?.url ||
    notification?.imageUrl ||
    notification?.image ||
    notification?.thumbnailUrl ||
    "";

  return {
    id:
      notification?.id ||
      notification?._id ||
      notification?.notificationId ||
      `${notification?.title || "notification"}-${index}`,
    title: notification?.title || "Untitled notification",
    message: notification?.body || notification?.message || "",
    category: formatNotificationCategory(notification),
    imageUrl: mediaUrl,
    createdAt:
      notification?.createdAt ||
      notification?.sentAt ||
      notification?.updatedAt ||
      new Date().toISOString(),
    status: notification?.status || "Sent",
  };
}

function CreateNotificationModal({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, submitting]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function setValue(key) {
    return (event) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setError("");
    };
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFileName(file.name);
    setError("");

    setUploading(true);
    try {
      const uploadedUrl = await uploadFile(file);
      if (uploadedUrl) {
        setForm((current) => ({ ...current, imageUrl: uploadedUrl }));
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(uploadedUrl);
      }
    } catch {
      setError("Image upload failed. You can paste a URL manually.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!form.message.trim()) {
      setError("Message is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = buildNotificationPayload(form);
      await sendNotification(payload);

      await onCreated({
        id: `notification-${Date.now()}`,
        title: payload.title,
        message: payload.body,
        category: form.category,
        imageUrl: form.imageUrl.trim() || previewUrl,
        createdAt: new Date().toISOString(),
        status: "Sent",
      });

      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to send notification."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[760px] rounded-[28px] bg-white p-5 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-center justify-between">
          <div className="w-full">
            <h2 className="text-center text-[26px] font-bold text-[#111827] sm:text-[30px]">
              Create Notification
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-[#5b626a] transition hover:bg-[#eef3f6] disabled:opacity-50"
            aria-label="Close create notification modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[15px] font-medium text-[#20242a]">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={setValue("title")}
                disabled={submitting}
                placeholder="Enter title"
                className="h-[52px] w-full rounded-[14px] border border-[#b9c1c9] px-5 text-[18px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#23616E] focus:ring-2 focus:ring-[#23616E]/10 disabled:bg-[#f8fafb]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-medium text-[#20242a]">
                Message
              </label>
              <textarea
                value={form.message}
                onChange={setValue("message")}
                disabled={submitting}
                placeholder="Enter message"
                rows={5}
                className="w-full rounded-[16px] border border-[#b9c1c9] px-5 py-4 text-[18px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#23616E] focus:ring-2 focus:ring-[#23616E]/10 disabled:bg-[#f8fafb]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-medium text-[#20242a]">
                Image URL
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={setValue("imageUrl")}
                disabled={submitting}
                placeholder="Upload or paste image URL"
                className="h-[52px] w-full rounded-[14px] border border-[#b9c1c9] px-5 text-[18px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#23616E] focus:ring-2 focus:ring-[#23616E]/10 disabled:bg-[#f8fafb]"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || uploading}
              className="inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-[12px] bg-[#2a6f7d] px-6 text-[17px] font-semibold text-white transition hover:bg-[#235f6b] disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus size={18} />
                  Upload Image
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div>
              <label className="mb-2 block text-[15px] font-medium text-[#20242a]">
                Category
              </label>
              <select
                value={form.category}
                onChange={setValue("category")}
                disabled={submitting}
                className="h-[52px] w-full rounded-[14px] border border-[#b9c1c9] bg-white px-5 text-[18px] text-[#20242a] outline-none transition focus:border-[#23616E] focus:ring-2 focus:ring-[#23616E]/10 disabled:bg-[#f8fafb]"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-[22px] bg-[#f4f8fa] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5b626a]">
              Preview
            </p>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-[#d9e5ea] bg-white shadow-[0_10px_30px_rgba(26,69,82,0.08)]">
              {(form.imageUrl.trim() || previewUrl) && (
                <div className="h-[140px] w-full bg-[#dceaf0]">
                  <img
                    src={form.imageUrl.trim() || previewUrl}
                    alt="Notification preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9edf2] text-[#23616E]">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      {form.title.trim() || "Notification title"}
                    </p>
                    <p className="text-xs text-[#6b7280]">{form.category}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#374151]">
                  {form.message.trim() ||
                    "Your notification message preview will appear here."}
                </p>

                {selectedFileName && !form.imageUrl.trim() && (
                  <p className="mt-3 truncate text-xs text-[#5b626a]">
                    Local preview: {selectedFileName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-[54px] rounded-[14px] border border-[#2a6f7d] px-8 text-[16px] font-medium text-[#2a6f7d] transition hover:bg-[#f2f8fa] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-[#2a6f7d] px-8 text-[16px] font-semibold text-white transition hover:bg-[#235f6b] disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            <Send size={16} />
            {submitting ? "Sending..." : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notification }) {
  return (
    <article className="rounded-[22px] border border-white/70 bg-white p-5 shadow-[0_10px_30px_rgba(33,73,85,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-[#20242a]">
              {notification.title}
            </h3>
            <span className="rounded-full bg-[#dceef2] px-3 py-1 text-xs font-semibold text-[#23616E]">
              {notification.category}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4b5563]">
            {notification.message}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-[#edf7ef] px-3 py-1 text-xs font-semibold text-[#248a46]">
          <CheckCircle2 size={14} />
          {notification.status}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 border-t border-[#edf2f4] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#6b7280]">
          Sent on {new Date(notification.createdAt).toLocaleString()}
        </div>

        {notification.imageUrl && (
          <a
            href={notification.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-[#23616E] transition hover:text-[#1a4f59]"
          >
            View image
          </a>
        )}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    hasPrev: false,
    hasNext: false,
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchNotifications({ page, limit: pageSize });
      const list = getNotificationList(response).map(normalizeNotification);
      setNotifications(list);
      setPagination(getPagination(response, list.length, pageSize));
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return notifications;
    }

    return notifications.filter((notification) => {
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.category.toLowerCase().includes(query)
      );
    });
  }, [notifications, search]);

  async function handleCreated(notification) {
    setNotifications((current) => [notification, ...current]);
    if (page === 1) {
      await loadNotifications();
      return;
    }

    setPage(1);
  }

  const totalNotifications = pagination.totalCount ?? notifications.length;
  const startRow = totalNotifications === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalNotifications);

  return (
    <div className="min-h-screen bg-[#eaf4f9] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[32px] font-bold leading-tight text-[#20242a] sm:text-[42px]">
              Notifications
            </h1>
            <p className="mt-2 text-lg text-[#2f3941]">
              Manage your notifications
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex h-[64px] items-center justify-center gap-3 rounded-[10px] bg-[#2a6f7d] px-8 text-[18px] font-semibold text-white transition hover:bg-[#235f6b]"
          >
            <Plus size={24} />
            Create Notification
          </button>
        </div>

        <section className="rounded-[26px] bg-white/85 p-5 shadow-[0_16px_40px_rgba(36,83,97,0.06)] backdrop-blur sm:p-6">
          <label className="relative block w-full max-w-[460px]">
            <Search
              size={22}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#20242a]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              className="h-[52px] w-full rounded-full border border-[#d5d9df] bg-[#f7f8fb] pl-14 pr-5 text-[18px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#23616E] focus:ring-2 focus:ring-[#23616E]/10"
            />
          </label>
        </section>

        <section className="mt-8 min-h-[420px] rounded-[30px] border border-white/50 bg-white/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6">
          {loading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] bg-white/40 px-6 text-center">
              <Loader2 size={34} className="animate-spin text-[#2a6f7d]" />
              <p className="mt-4 text-base font-medium text-[#4b5563]">
                Loading notifications...
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-red-100 bg-red-50/70 px-6 text-center">
              <h2 className="text-2xl font-semibold text-red-700">
                Could not load notifications
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-red-600">
                {error}
              </p>
              <button
                type="button"
                onClick={loadNotifications}
                className="mt-5 rounded-[12px] bg-[#2a6f7d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#235f6b]"
              >
                Try again
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#c7d8de] bg-white/40 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dbeef3] text-[#2a6f7d]">
                <Bell size={28} />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-[#20242a]">
                No notifications yet
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#5b626a]">
                Create and send your first push notification from here. Broadcast
                notifications from the server will appear in this list.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>

              <PaginationControls
                className="mt-6"
                rowsPerPage={pageSize}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onRowsPerPageChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }}
                rangeLabel={`${startRow}-${endRow} of ${totalNotifications}`}
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                hasPrev={pagination.hasPrev}
                hasNext={pagination.hasNext}
                disabled={loading}
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
      </div>

      {showCreateModal && (
        <CreateNotificationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
