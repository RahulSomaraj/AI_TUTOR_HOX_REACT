import { useState, useRef, useEffect, useCallback } from "react";
import PaginationControls from "../components/PaginationControls";
import { X, Loader2, Upload } from "lucide-react";
import {
  fetchBanners, createBanner, updateBanner, deleteBanner,
} from "../api/services/banners";
import { uploadFile } from "../api/services/catalog";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import SearchInput from "../components/ui/SearchInput";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// ─── Image Upload Field ────────────────────────────────────────────────────────
function ImageUploadField({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) onChange(url);
      else setUploadError("Upload succeeded but no URL returned.");
    } catch {
      setUploadError("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#23616E] focus-within:ring-1 focus-within:ring-[#23616E]/20 transition-colors">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Upload image"
          className="flex-1 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none bg-white"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2.5 bg-gray-50 border-l border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Upload image file"
        >
          {uploading
            ? <Loader2 size={16} className="animate-spin text-gray-500" />
            : <Upload size={16} className="text-gray-500" />
          }
        </button>
      </div>
      {uploadError && (
        <p className="text-xs text-red-500 mt-1">{uploadError}</p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ─── Add Banner Modal ──────────────────────────────────────────────────────────
function AddBannerModal({ onClose, onSuccess }) {
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage]             = useState("");
  const [error, setError]             = useState("");
  const [submitting, setSubmitting]   = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) return setError("Please enter a title.");
    if (!image.trim()) return setError("Please provide an image URL or upload an image.");

    setSubmitting(true);
    try {
      await createBanner({ title: title.trim(), description: description.trim(), image: image.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add banner. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Add Banner</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Special Summer Offer"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Get up to 50% off on all courses this summer!"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
            <ImageUploadField value={image} onChange={setImage} />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button" onClick={onClose} disabled={submitting}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Banner Modal ─────────────────────────────────────────────────────────
function EditBannerModal({ banner, onClose, onSuccess }) {
  const [title, setTitle]             = useState(banner.title || "");
  const [description, setDescription] = useState(banner.description || "");
  const [image, setImage]             = useState(banner.image || banner.imageUrl || "");
  const [error, setError]             = useState("");
  const [submitting, setSubmitting]   = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) return setError("Please enter a title.");
    if (!image.trim()) return setError("Please provide an image URL or upload an image.");

    setSubmitting(true);
    try {
      await updateBanner(banner.id, { title: title.trim(), description: description.trim(), image: image.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update banner. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Edit Banner</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Banner title"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Banner description" rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
            <ImageUploadField value={image} onChange={setImage} />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button" onClick={onClose} disabled={submitting}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BannerPage() {
  const [banners, setBanners]       = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(totalCount /itemsPerPage);

  const loadBanners = useCallback(() => {
    setLoading(true);
    const params = { page, limit: itemsPerPage };
    if (search.trim()) params.title = search.trim();

    fetchBanners(params)
      .then((res) => {
        const list  = res?.data?.banners || res?.data?.data || res?.data || [];
        const count =
          res?.pagination?.totalCount ||
          res?.data?.pagination?.totalCount ||
          res?.data?.total ||
          list.length;
        setBanners(Array.isArray(list) ? list : []);
        setTotalCount(count);
      })
      .catch(() => { setBanners([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [page, search, itemsPerPage]);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteBanner(id);
      if (banners.length === 1 && page > 1) setPage((p) => p - 1);
      else loadBanners();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const truncate = (str = "", n = 55) =>
    str.length > n ? str.slice(0, n) + "…" : str;

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (b) => (
        <span className="font-medium text-gray-800">{b.title || "-"}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (b) => (
        <span className="text-gray-600">{truncate(b.description || "", 60) || "-"}</span>
      ),
    },
    {
      key: "image",
      header: "Image",
      render: (b) => (
        <span className="text-xs font-mono text-gray-800">
          {truncate(b.image || "-", 45)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <ActionMenu
          label={b.title || "banner"}
          onEdit={() => setEditBanner(b)}
          onDelete={() => setDeleteId(b.id)}
        />
      ),
    },
  ];

  return (
    <div className="ty-page-shell flex flex-col">
      <Breadcrumb items={[{ label: "Banner" }]} />

      {/* ── Modals ── */}
      {showAdd && (
        <AddBannerModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setPage(1); loadBanners(); }}
        />
      )}
      {editBanner && (
        <EditBannerModal
          banner={editBanner}
          onClose={() => setEditBanner(null)}
          onSuccess={loadBanners}
        />
      )}
      {deleteId && (
        <ConfirmDialog
          title="Remove Banner"
          message="Are you sure you want to remove this banner? This action cannot be undone."
          confirmLabel="Remove"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}

      {/* ── Page Header  ── */}
      <PageHeader
        title="Banner"
        actionLabel="Add Banner"
        onAction={() => setShowAdd(true)}
      />

      {/* ── Search Card ── */}
      <div className="mb-4 bg-white rounded-2xl border border-gray-200 px-6 py-4">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Search banner by title..."
        />
      </div>

      {/* ── Banner List Card ── */}
      <div className="mb-6 bg-white rounded-2xl overflow-hidden border border-gray-200">

        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Banner List</h2>
        </div>

        <div className="px-5">
          <DataTable
                    startIndex={(page - 1) * itemsPerPage}
            columns={columns}
            rows={banners}
            loading={loading}
            emptyLabel="No banners found."
            rowKey={(b) => b.id}
          />
        </div>

        {/* ── Pagination ── */}
        {banners.length > 0 && !loading && (
<div className="px-6 py-4 border-t border-gray-100">
  <PaginationControls
    currentPage={page}
    totalPages={totalPages || 1}
    onPrev={() => setPage((p) => Math.max(1, p - 1))}
    onNext={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
    rowsPerPage={itemsPerPage}
    rowsPerPageOptions={[10, 20, 50]}
    onRowsPerPageChange={(val) => {
      setItemsPerPage(val);
      setPage(1);
    }}
    rangeLabel={`${(page - 1) * itemsPerPage+ 1}–${Math.min(page * itemsPerPage, totalCount)} of ${totalCount}`}
    disabled={loading}
  />
</div>
        )}

      </div>
    </div>
  );
}
