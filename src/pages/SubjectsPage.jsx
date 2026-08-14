import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import SearchInput from "../components/ui/SearchInput";
import SearchableSelect from "../components/ui/SearchableSelect";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import {
  createSubject,
  fetchBoardGrades,
  fetchBoards,
  updateSubject,
  uploadFile,
} from "../api/services/catalog";
import { extractList, safeId } from "../api/normalize";
import {
  useDeleteSubject,
  useInvalidateSubjects,
  useSubjectsQuery,
} from "../features/subjects/useSubjects";
import logger from "../lib/logger";

const PAGE_SIZE = 10;
const DROPDOWN_LIMIT = 10;

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
        logger.error("Failed to load board grades:", err);
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

export default function SubjectsPage() {
  // Boards/grades powering the filter + modal dropdowns stay as local state
  // (search-as-you-type). The subjects list itself is server cache (see below).
  const [grades, setGrades] = useState([]);
  const [boards, setBoards] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState("");

  const invalidateSubjects = useInvalidateSubjects();
  const deleteSubjectMutation = useDeleteSubject();
  const deleting = deleteSubjectMutation.isPending;

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
      logger.error("Failed to load education boards:", err);
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
        logger.error("Failed to load board grades:", err);
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

  // Debounce the free-text search so we don't refetch on every keystroke; the
  // debounced value feeds the query key, which is what drives refetching.
  const debouncedSearch = useDebounce(search, 300);

  const subjectsQuery = useSubjectsQuery({
    page,
    limit: pageSize,
    search: debouncedSearch,
    boardGradeId: selectedGradeId,
    boardId: selectedBoardId,
  });

  const rawSubjects = subjectsQuery.data?.raw ?? [];
  const pagination = subjectsQuery.data?.pagination ?? {
    currentPage: page,
    totalPages: 1,
    totalCount: 0,
    pageSize,
    hasPrev: false,
    hasNext: false,
  };
  const loading = subjectsQuery.isPending;
  const loadError = subjectsQuery.isError
    ? subjectsQuery.error?.response?.data?.message ||
      subjectsQuery.error?.response?.data?.error ||
      subjectsQuery.error?.message ||
      "Failed to load subjects"
    : "";
  const error = actionError || loadError;

  // Map raw rows here (not in the query) because the display depends on the
  // separately-loaded boards/grades for label resolution.
  const subjects = useMemo(
    () =>
      rawSubjects.map((subject, index) =>
        mapSubjectRow(subject, index, grades, boards)
      ),
    [rawSubjects, grades, boards]
  );

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

    setActionError("");
    try {
      await deleteSubjectMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);

      // If we just removed the last row on a non-first page, step back a page;
      // otherwise the mutation's onSuccess already invalidated the list.
      if (subjects.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      }
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete subject"
      );
    }
  }

  const startRow = totalSubjects === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalSubjects);

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-[#2a2d32]">{row.name}</span>
      ),
    },
    { key: "code", header: "Code" },
    { key: "boardName", header: "Board" },
    { key: "boardGradeLabel", header: "Board Grade" },
    {
      key: "optional",
      header: "Optional",
      render: (row) => (row.isOptional ? "Yes" : "No"),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <ActionMenu
          label={row.name}
          onEdit={() => openEditModal(row)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <div className="ty-page-shell">
      <Breadcrumb
        items={[
          { label: "Curriculum Management", path: "/curriculum" },
          { label: "Subjects" },
        ]}
      />
      <PageHeader
        title="Subjects"
        subtitle={`${totalSubjects} Subjects`}
        actionLabel="Add Subject"
        onAction={openAddModal}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search subjects by name..."
        />

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

        <DataTable
                    startIndex={Math.max(startRow - 1, 0)}
          columns={columns}
          rows={subjects}
          loading={loading}
          error={error}
          emptyLabel="No subjects found."
          rowKey={(row) => row.id}
        />

        {!loading && !error && subjects.length > 0 && (
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
            invalidateSubjects();
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
            invalidateSubjects();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Subject"
          message={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#20242a]">
                {deleteTarget.name}
              </span>
              ?
            </>
          }
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteSubject}
        />
      )}
    </div>
  );
}
