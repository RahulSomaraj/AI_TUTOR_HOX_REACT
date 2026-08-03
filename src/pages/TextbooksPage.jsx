import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Eye, Loader2 } from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import SearchInput from "../components/ui/SearchInput";
import SearchableSelect from "../components/ui/SearchableSelect";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { extractList, extractPagination, safeId } from "../api/normalize";
import {
  createTextbook,
  deleteTextbook,
  fetchTextbooks,
  updateTextbook,
} from "../api/services/textbooks";
import { fetchSubjects } from "../api/services/catalog";

const PAGE_SIZE = 10;

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
  const [selectedSubjectOption, setSelectedSubjectOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [activeTextbook, setActiveTextbook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    subjects: filterSubjects,
    loading: filterSubjectsLoading,
    search: searchFilterSubjects,
  } = useSubjectSearch();

  const filterOptions = useMemo(
    () => [{ value: "", label: "All Subjects" }, ...filterSubjects],
    [filterSubjects]
  );

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
    navigate(`/curriculum/syllabus/${textbook.id}/chapters`, {
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

  const columns = [
    { key: "title", header: "Title", render: (row) => (
        <span className="font-medium text-[#2a2d32]">{row.title}</span>
      ) },
    { key: "code", header: "Code" },
    { key: "source", header: "Source" },
    { key: "subjectName", header: "Subject" },
    { key: "subjectCode", header: "Subject Code" },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <ActionMenu
          label={row.title}
          onEdit={() => openEditModal(row)}
          onDelete={() => setDeleteTarget(row)}
          extraItems={[
            {
              label: "View",
              icon: <Eye size={14} className="text-[#155966]" />,
              onClick: () => openChaptersPage(row),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="ty-page-shell">
      <Breadcrumb
        items={[
          { label: "Curriculum Management", path: "/curriculum" },
          { label: "Syllabus" },
        ]}
      />
      <PageHeader
        title="Syllabus"
        subtitle={`${totalTextbooks} Syllabus`}
        actionLabel="Add Syllabus"
        onAction={openAddModal}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(nextValue) => {
            setSearch(nextValue);
            setPage(1);
          }}
          placeholder="Search syllabus by source..."
        />

        <div className="w-full sm:w-[240px]">
          <SearchableSelect
            value={selectedSubjectOption}
            onChange={(option) => {
              setSelectedSubjectOption(option?.value ? option : null);
              setSelectedSubjectId(option?.value ?? "");
              setPage(1);
            }}
            onSearch={searchFilterSubjects}
            options={filterOptions}
            loading={filterSubjectsLoading}
            placeholder="All Subjects"
            searchPlaceholder="Search subject..."
            emptyLabel="No subjects found"
          />
        </div>
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Syllabus List
        </h2>

        <DataTable
          columns={columns}
          rows={rowsToShow}
          loading={loading}
          error={error}
          emptyLabel="No syllabus found."
          rowKey={(row) => row.id}
          minWidth={1080}
        />

        {!loading && !error && rowsToShow.length > 0 && (
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
        <ConfirmDialog
          title="Delete Syllabus"
          message={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#20242a]">{deleteTarget.title}</span>?
            </>
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
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
