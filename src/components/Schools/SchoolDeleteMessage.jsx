import { AlertTriangle } from "lucide-react";

/**
 * Body for the delete-institution confirmation. Deleting a school is a
 * cascading soft-delete on the backend — it also removes that school's
 * classes, syllabus, and student accounts — so the dialog spells that out
 * rather than asking a bare "are you sure?".
 */
export default function SchoolDeleteMessage({ schoolName }) {
  return (
    <>
      <p>
        Are you sure you want to delete{" "}
        <span className="font-semibold text-[#20242a]">{schoolName}</span>?
      </p>

      <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="text-xs leading-relaxed text-amber-900">
          <span className="font-semibold">This also removes everything under it.</span>{" "}
          The institution's classes, syllabus, and student accounts are deleted along
          with it. This cannot be undone from the dashboard.
        </div>
      </div>
    </>
  );
}
