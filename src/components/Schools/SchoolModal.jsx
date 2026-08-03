import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ImageIcon, ImageOff, Loader2, X } from "lucide-react";
import { extractList, safeId } from "../../api/normalize";
import { createSchool, updateSchool } from "../../api/services/schools";
import { fetchBoards, uploadFile } from "../../api/services/catalog";

function mapBoardOption(board) {
  return {
    id: safeId(board?.id ?? board?._id ?? board?.boardId),
    name: board?.name ?? board?.boardName ?? "Board",
  };
}

// Board list for the form's dropdown. Shared query key so the Institution list
// and detail pages reuse one cached fetch.
function useBoardOptionsQuery() {
  return useQuery({
    queryKey: ["boards", "options"],
    queryFn: async () => {
      const response = await fetchBoards();
      return extractList(response, ["boards", "educationBoards"])
        .map(mapBoardOption)
        .filter((board) => board.id);
    },
    staleTime: 60_000,
  });
}

// Rendered with `key={src}` so a changed URL remounts this and clears `failed`,
// rather than resetting it from an effect.
function ImagePreview({ src, schoolName }) {
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  if (failed) {
    return (
      <div className="relative mt-4 flex h-28 w-36 items-center justify-center rounded-[14px] border border-[#dbe3e8] bg-[#f6f8fb] text-center text-sm text-[#3a3c42]">
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

/**
 * Add/edit form for an institution. `initialData` is tolerant of both the
 * mapped list-row shape (`name`) and the raw API shape (`schoolName`,
 * `image` as an array), so the list and detail pages can both pass what
 * they already have.
 */
export default function SchoolModal({ initialData = null, onClose, onSuccess }) {
  const isEdit = Boolean(initialData);
  const boardOptionsQuery = useBoardOptionsQuery();
  const boardOptions = boardOptionsQuery.data ?? [];

  const [form, setForm] = useState({
    schoolName: initialData?.schoolName ?? initialData?.name ?? "",
    address: initialData?.address ?? "",
    schoolCode: initialData?.schoolCode ?? "",
    boardId: safeId(initialData?.boardId ?? initialData?.board?.id ?? ""),
    schoolImage: (() => {
      const raw = initialData?.image;
      if (Array.isArray(raw)) return raw[0] ?? "";
      return typeof raw === "string" ? raw : "";
    })(),
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
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const setValue = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.schoolName.trim()) return setError("School name is required.");
    if (!form.address.trim()) return setError("Address is required.");
    if (!form.schoolCode.trim()) return setError("School code is required.");
    if (!form.boardId) return setError("Board is required.");

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
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#20242a]">
              {isEdit ? "Edit Institution" : "Add Institution"}
            </h2>
            <p className="mt-2 text-sm text-[#5b626a]">
              {isEdit
                ? "Update the institution details below and save your changes."
                : "Create an institution record with the core details used across the dashboard."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-[#d7dde2] p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close institution modal"
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
            <span className="mb-2 block text-sm font-medium text-[#20242a]">School Name *</span>
            <input
              value={form.schoolName}
              onChange={setValue("schoolName")}
              disabled={saving}
              placeholder="Army Public School"
              className="h-12 w-full rounded-[14px] border border-[#c7cbd1] px-5 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">Address *</span>
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
            <span className="mb-2 block text-sm font-medium text-[#20242a]">School Code *</span>
            <input
              value={form.schoolCode}
              onChange={setValue("schoolCode")}
              disabled={saving}
              placeholder="APS001"
              className="h-12 w-full rounded-[14px] border border-[#c7cbd1] px-5 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
          </label>

          <label className="relative block">
            <span className="mb-2 block text-sm font-medium text-[#20242a]">Board *</span>
            <select
              value={form.boardId}
              onChange={setValue("boardId")}
              disabled={saving || boardOptionsQuery.isPending}
              className="h-12 w-full appearance-none rounded-[14px] border border-[#c7cbd1] bg-white px-5 pr-12 text-[16px] text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            >
              <option value="">
                {boardOptionsQuery.isPending ? "Loading boards..." : "Select Board"}
              </option>
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
            <span className="mb-2 block text-sm font-medium text-[#20242a]">School Image</span>
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
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
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

          <ImagePreview
            key={form.schoolImage.trim()}
            src={form.schoolImage.trim()}
            schoolName={form.schoolName.trim()}
          />
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
