import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarRange,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  UserCheck,
  Users,
  CalendarCheck,
  ImageOff,
} from "lucide-react";
import Breadcrumb from "../components/ui/Breadcrumb";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SchoolModal from "../components/Schools/SchoolModal";
import SchoolDeleteMessage from "../components/Schools/SchoolDeleteMessage";
import { deleteSchool } from "../api/services/schools";
import { useSchoolQuery } from "../features/schools/useSchool";

function apiError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export default function SchoolDetailPage() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const schoolQuery = useSchoolQuery(schoolId);

  const school = schoolQuery.data;
  const loading = schoolQuery.isPending;
  const loadError = schoolQuery.isError
    ? apiError(schoolQuery.error, "Failed to load this institution")
    : "";
  const error = actionError || loadError;

  const image = Array.isArray(school?.image) ? school.image[0] : school?.image;

  async function handleDelete() {
    setActionError("");
    try {
      setDeleting(true);
      await deleteSchool(schoolId);
      // Drop the cached record so the list doesn't show a stale entry.
      queryClient.removeQueries({ queryKey: ["school", schoolId] });
      navigate("/schools", {
        replace: true,
        state: { message: `${school?.schoolName ?? "Institution"} was deleted.` },
      });
    } catch (err) {
      setActionError(apiError(err, "Failed to delete this institution"));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const shortcuts = [
    { label: "Academic Years", desc: "Set up and activate academic years.", icon: CalendarRange, path: `/academic-years?schoolId=${schoolId}` },
    { label: "Classes", desc: "View and manage classes/sections.", icon: BookOpen, path: `/classes?schoolId=${schoolId}` },
    { label: "Students", desc: "View and manage enrolled students.", icon: UserCheck, path: `/students?schoolId=${schoolId}` },
    { label: "Teachers", desc: "View and manage teaching staff.", icon: GraduationCap, path: `/teachers?schoolId=${schoolId}` },
    { label: "Parents", desc: "View and manage linked parents.", icon: Users, path: `/parents?schoolId=${schoolId}` },
    { label: "Manage Attendance", desc: "Record and review attendance.", icon: CalendarCheck, path: `/attendance?schoolId=${schoolId}` },
  ];

  return (
    <div className="ty-page-shell">
      <Breadcrumb
        items={[
          { label: "Institution Management", path: "/schools" },
          { label: school?.schoolName ?? (loading ? "Loading..." : "Institution") },
        ]}
      />

      {loading && (
        <div className="py-16 text-center text-sm text-[#5b626a]">
          <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
          <p className="mt-3">Loading...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !loadError && school && (
        <>
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="ty-page-title">{school.schoolName}</h1>
              <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
                {school.schoolCode} · {school.board?.name ?? "No board"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#155966] px-4 py-2 text-sm font-semibold text-[#155966] transition hover:bg-[#155966] hover:text-white"
              >
                <Pencil size={15} strokeWidth={2} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-[#d14343] transition hover:bg-red-50"
              >
                <Trash2 size={15} strokeWidth={2} />
                Delete
              </button>
            </div>
          </div>

          <section className="mb-6 flex flex-col gap-5 rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:flex-row sm:px-6 sm:py-7">
            {image ? (
              <img
                src={image}
                alt={`${school.schoolName} preview`}
                className="h-28 w-36 shrink-0 rounded-[14px] border border-[#dbe3e8] object-cover"
              />
            ) : (
              <div className="flex h-28 w-36 shrink-0 items-center justify-center rounded-[14px] border border-[#dbe3e8] bg-[#f6f8fb] text-[#7b8794]">
                <ImageOff size={20} />
              </div>
            )}

            <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8d969c]">Address</dt>
                <dd className="mt-1 text-sm text-[#20242a]">{school.address || "Not available"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8d969c]">School Code</dt>
                <dd className="mt-1 text-sm text-[#20242a]">{school.schoolCode || "Not available"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8d969c]">Board</dt>
                <dd className="mt-1 text-sm text-[#20242a]">{school.board?.name ?? "Not available"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8d969c]">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      school.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {school.isActive ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map(({ label, desc, icon: Icon, path }) => (
              <Link
                key={path}
                to={path}
                className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#23616E] hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#23616E]/10 text-[#23616E] transition group-hover:bg-[#23616E] group-hover:text-white">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-[#202224]">{label}</span>
                  <span className="mt-1 block text-[13px] leading-snug text-gray-500">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {editOpen && school && (
        <SchoolModal
          initialData={school}
          onClose={() => setEditOpen(false)}
          onSuccess={() => schoolQuery.refetch()}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Institution"
          message={<SchoolDeleteMessage schoolName={school?.schoolName ?? "this institution"} />}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
          onCancel={() => {
            if (!deleting) setConfirmDelete(false);
          }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
