import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  createSubject,
  fetchBoards,
  fetchGrades,
  fetchSubjects,
  fetchSyllabi,
} from "../api/authService";
import PaginationControls from "../components/PaginationControls";

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

function extractPagination(response) {
  return response?.pagination ?? response?.data?.pagination ?? null;
}

function extractRecord(response, keys) {
  const list = extractList(response, keys);
  if (list.length > 0) return list[0];

  for (const key of keys) {
    if (response?.[key] && !Array.isArray(response[key])) return response[key];
    if (response?.data?.[key] && !Array.isArray(response.data[key])) {
      return response.data[key];
    }
  }

  if (response?.data && !Array.isArray(response.data)) return response.data;
  return null;
}

function mapGrade(grade) {
  return {
    id: grade?.id ?? grade?._id ?? grade?.boardGradeId,
    label: grade?.aliasName ?? grade?.name ?? grade?.gradeName ?? "Class",
    boardGradeId: grade?.boardGradeId ?? grade?.boardGrade?.id ?? grade?.id,
  };
}

function mapBoard(board) {
  return {
    id: board?.id ?? board?._id,
    label: board?.name ?? board?.boardName ?? "Board",
  };
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

function getEntityId(value) {
  return value?.id ?? value?._id ?? value?.uuid;
}

function normalizeChapter(chapter, index) {
  const totalTopics =
    chapter?.totalTopics ??
    chapter?.topicsCount ??
    chapter?.topics?.length ??
    chapter?.total ??
    0;
  const completedTopics =
    chapter?.completedTopics ??
    chapter?.completedTopicCount ??
    chapter?.completed ??
    0;
  const progress =
    chapter?.progress ??
    chapter?.completionPercentage ??
    (totalTopics > 0
      ? Math.round((completedTopics / Math.max(totalTopics, 1)) * 100)
      : 0);

  return {
    title:
      chapter?.title ??
      chapter?.name ??
      chapter?.chapterName ??
      `Untitled Chapter ${index + 1}`,
    topics: `${completedTopics}/${totalTopics} Topics`,
    progress,
  };
}

function normalizeSections(syllabus) {
  const rawSections =
    syllabus?.sections ??
    syllabus?.units ??
    syllabus?.chapters ??
    syllabus?.topics ??
    [];

  if (!Array.isArray(rawSections) || rawSections.length === 0) return [];

  return rawSections.slice(0, 3).map((section, index) => {
    const chapters = Array.isArray(section?.chapters)
      ? section.chapters
      : Array.isArray(section?.topics)
        ? section.topics
        : Array.isArray(section?.lessons)
          ? section.lessons
          : [];

    return {
      title:
        section?.title ??
        section?.name ??
        section?.chapterName ??
        section?.topicName ??
        `Section ${index + 1}`,
      open: index === 0,
      chapters: chapters.slice(0, 4).map(normalizeChapter),
    };
  });
}

function mapSubject(subject, index, syllabus = null) {
  const name = getSubjectName(subject);
  const subjectId = getEntityId(subject);
  const progress =
    syllabus?.progress ??
    syllabus?.completionPercentage ??
    subject?.progress ??
    subject?.completionPercentage ??
    0;

  return {
    id: subjectId ?? subject?.code ?? `${name}-${index}`,
    syllabusId: getEntityId(syllabus),
    hasSyllabus: Boolean(syllabus),
    name,
    code: subject?.code ?? "",
    progress,
    status:
      syllabus?.status === "completed" || subject?.isActive === false
        ? "Completed"
        : syllabus
          ? "Inprogress"
          : "No syllabus",
    open: index === 0,
    sections: normalizeSections(syllabus),
  };
}

function StatusBadge({ status }) {
  const isComplete = status === "Completed";
  const isMissing = status === "No syllabus";

  return (
    <span
      className={`rounded px-3 py-1 text-[11px] font-semibold leading-none text-white ${
        isComplete ? "bg-[#00a884]" : isMissing ? "bg-slate-400" : "bg-[#ff8a00]"
      }`}
    >
      {status}
    </span>
  );
}

function ProgressBar({ value, small = false }) {
  const progress = Math.max(0, Math.min(Number(value) || 0, 100));

  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#e7eff1]">
        <div
          className="h-full rounded-full bg-[#23616e]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-[#5f6c72] ${small ? "w-7 text-[10px]" : "w-8 text-xs"}`}
      >
        {progress}%
      </span>
    </div>
  );
}

function ExpandedSubject({ subject, onToggle }) {
  const [openSectionKey, setOpenSectionKey] = useState(
    subject.sections[0]?.title ?? ""
  );
  const availableSectionTitles = subject.sections.map((section) => section.title);
  const activeSectionKey = availableSectionTitles.includes(openSectionKey)
    ? openSectionKey
    : (subject.sections[0]?.title ?? "");

  const openSection = subject.sections.find(
    (section) => section.title === activeSectionKey
  );
  const closedSections = subject.sections.filter(
    (section) => section.title !== activeSectionKey
  );

  return (
    <article className="rounded-lg bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="mb-4 flex w-full items-center justify-between text-left"
        aria-expanded="true"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#24272a]">{subject.name}</h2>
          <StatusBadge status={subject.status} />
        </div>
        <ChevronUp size={17} className="text-black" />
      </button>

      {subject.hasSyllabus && openSection ? (
        <div className="rounded-md border border-[#d9e0e3]">
          <button
            type="button"
            onClick={() => setOpenSectionKey("")}
            className="flex h-11 w-full items-center justify-between px-5 text-left"
            aria-expanded="true"
          >
            <h3 className="text-sm font-semibold text-[#151719]">
              {openSection.title}
            </h3>
            <ChevronUp size={15} className="text-black" />
          </button>

          <div className="divide-y divide-[#edf1f2] border-t border-[#edf1f2] px-5">
            {openSection.chapters.length > 0 ? (
              openSection.chapters.map((chapter) => (
                <div
                  key={chapter.title}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(160px,260px)_24px] items-center gap-5 py-4"
                >
                  <p className="min-w-0 text-[13px] font-medium text-black">
                    {chapter.title} <span>({chapter.topics})</span>
                  </p>
                  <ProgressBar value={chapter.progress} small />
                  <MoreHorizontal size={18} className="text-black" />
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-slate-500">
                No chapters found for this syllabus.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-[#d9e0e3] px-5 py-6 text-sm text-slate-500">
          No syllabus found for this subject.
        </div>
      )}

      {closedSections.map((item) => (
        <button
          key={item.title}
          type="button"
          onClick={() => setOpenSectionKey(item.title)}
          className="mt-4 flex h-12 w-full items-center justify-between rounded-md border border-[#d9e0e3] px-5 text-left text-base font-semibold text-[#24272a]"
          aria-expanded="false"
        >
          {item.title}
          <ChevronDown size={16} />
        </button>
      ))}
    </article>
  );
}

function CollapsedSubject({ subject, onToggle }) {
  return (
    <article className="rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[66px] w-full items-center justify-between px-5 text-left"
        aria-expanded="false"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#24272a]">{subject.name}</h2>
          <StatusBadge status={subject.status} />
        </div>
        <ChevronDown size={16} />
      </button>
    </article>
  );
}

function ProgressOverview({ subjects }) {
  return (
    <aside className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold text-[#24272a]">
        Progress Overview
      </h2>

      <div className="space-y-6">
        {subjects.slice(0, 6).map((subject) => (
          <div key={subject.id}>
            <p className="mb-3 text-sm font-medium text-black">{subject.name}</p>
            <ProgressBar value={subject.progress} />
          </div>
        ))}
      </div>
    </aside>
  );
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

function SubjectCodeDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false));

  const filtered = query.trim()
    ? options.filter((code) =>
        code.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const displayLabel = value || "Search by subject...";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-[220px] items-center gap-2 rounded-full border border-[#d9dfe2] bg-[#f8f8fa] px-3 text-xs text-[#8f989e] transition focus:border-[#155966] focus:outline-none"
      >
        <Search size={14} className="shrink-0 text-[#98a2a8]" />
        <span className="flex-1 truncate text-left">
          {value ? (
            <span className="text-slate-700">{value}</span>
          ) : (
            displayLabel
          )}
        </span>
        <ChevronDown size={13} className="shrink-0 text-[#5d666b]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-[220px] overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <div className="border-b border-[#eef0f2] p-2">
            <div className="flex items-center gap-2 rounded-full border border-[#d9dfe2] bg-[#f8f8fa] px-3">
              <Search size={13} className="shrink-0 text-[#98a2a8]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject..."
                className="h-8 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-[#8f989e]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[#98a2a8] hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setQuery("");
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-xs transition hover:bg-[#f5fafc] ${
                !value ? "font-semibold text-[#155966]" : "text-slate-700"
              }`}
            >
              All Subjects
            </button>
            {filtered.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  onChange(code);
                  setQuery("");
                  setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-xs transition hover:bg-[#f5fafc] ${
                  value === code ? "font-semibold text-[#155966]" : "text-slate-700"
                }`}
              >
                {code}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400">No subjects found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddSubjectModal({ boards, grades, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    boardGradeId: "",
    boardId: "",
    isOptional: false,
    imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setValue = (key) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleGradeChange = (event) => {
    const boardGradeId = event.target.value;
    const grade = grades.find(
      (item) => String(item.boardGradeId) === boardGradeId
    );

    setForm((current) => ({
      ...current,
      boardGradeId,
      boardId: grade?.boardId ? String(grade.boardId) : current.boardId,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Subject name is required.");
      return;
    }

    if (!form.boardGradeId || !form.boardId) {
      setError("Class and board are required.");
      return;
    }

    const images = form.imageUrl
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      setSaving(true);
      setError("");
      await createSubject({
        name: form.name.trim(),
        description: form.description.trim(),
        boardGradeId: Number(form.boardGradeId),
        boardId: Number(form.boardId),
        isOptional: form.isOptional,
        images,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to add subject"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#24272a]">Add Subject</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close add subject modal"
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
              placeholder="Mathematics"
              className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={setValue("description")}
              placeholder="Introduction to Mathematics"
              rows={3}
              className="w-full resize-none rounded border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Class *
              </span>
              <select
                value={form.boardGradeId}
                onChange={handleGradeChange}
                className="h-11 w-full rounded border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10"
              >
                <option value="">Select Class</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.boardGradeId}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Board *
              </span>
              <select
                value={form.boardId}
                onChange={setValue("boardId")}
                className="h-11 w-full rounded border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10"
              >
                <option value="">Select Board</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Image URL
            </span>
            <input
              value={form.imageUrl}
              onChange={setValue("imageUrl")}
              placeholder="https://example.com/logo.png"
              className="h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10"
            />
            <span className="mt-1 block text-xs text-slate-400">
              Use commas for multiple image URLs.
            </span>
          </label>

          <label className="flex items-center gap-3 rounded border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={form.isOptional}
              onChange={setValue("isOptional")}
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
            {saving ? "Adding..." : "Add Subject"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState([]);
  const [allSubjectOptions, setAllSubjectOptions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [boardId] = useState("");
  const [isActive] = useState("");
  const [isOptional] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedGrade = useMemo(
    () => grades.find((grade) => String(grade.id) === selectedGradeId),
    [grades, selectedGradeId]
  );

  const allSubjectNames = useMemo(
    () => [...new Set(allSubjectOptions.map(getSubjectName).filter(Boolean))],
    [allSubjectOptions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [gradesResponse, boardsResponse] = await Promise.all([
          fetchGrades(),
          fetchBoards(),
        ]);
        if (!cancelled) {
          setGrades(extractList(gradesResponse, ["grades"]).map(mapGrade));
          setBoards(extractList(boardsResponse, ["boards"]).map(mapBoard));
        }
      } catch (err) {
        console.error("Failed to load subject options:", err);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Independently load the full list of subjects for the dropdown so that
  // the dropdown options don't shrink when the user picks a value or changes
  // the search filter (which would otherwise filter the source list itself).
  useEffect(() => {
    let cancelled = false;

    async function loadAllSubjects() {
      try {
        const response = await fetchSubjects({
          page: 1,
          limit: 1000,
          order: "asc",
          boardGradeId: selectedGrade?.boardGradeId || undefined,
        });
        const list = extractList(response, ["subjects"]);
        if (!cancelled) {
          setAllSubjectOptions(list);
        }
      } catch (err) {
        console.error("Failed to load subject dropdown options:", err);
        if (!cancelled) {
          setAllSubjectOptions([]);
        }
      }
    }

    loadAllSubjects();
    return () => {
      cancelled = true;
    };
  }, [selectedGrade, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          page,
          limit: pageSize,
          order: "desc",
          name: selectedCode || search.trim() || undefined,
          boardGradeId: selectedGrade?.boardGradeId || undefined,
          boardId: boardId || undefined,
          isActive: isActive === "" ? undefined : isActive === "true",
          isOptional: isOptional === "" ? undefined : isOptional === "true",
        };
        const subjectResponse = await fetchSubjects(params);
        const subjectList = extractList(subjectResponse, ["subjects"]);
        const syllabusResponses = await Promise.allSettled(
          subjectList.map((subject) => {
            const subjectId = getEntityId(subject);

            if (!subjectId) return Promise.resolve(null);

            return fetchSyllabi({
              page: 1,
              limit: 10,
              order: "desc",
              subjectId,
              boardGradeId: selectedGrade?.boardGradeId || undefined,
            });
          })
        );
        const mappedSubjects = subjectList.map((subject, index) => {
          const result = syllabusResponses[index];
          const syllabus =
            result?.status === "fulfilled" && result.value
              ? extractRecord(result.value, ["syllabi", "syllabus", "items", "results"])
              : null;

          return mapSubject(subject, index, syllabus);
        });

        if (!cancelled) {
          setSubjects(mappedSubjects);
          setPagination(extractPagination(subjectResponse));
          setExpandedSubjectId((currentId) => {
            if (mappedSubjects.some((subject) => subject.id === currentId)) {
              return currentId;
            }

            return mappedSubjects[0]?.id ?? null;
          });
        }
      } catch (err) {
        console.error("Failed to load syllabus page:", err);
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Failed to load syllabus"
          );
          setSubjects([]);
          setPagination(null);
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
  }, [boardId, selectedCode, isActive, isOptional, page, pageSize, reloadKey, search, selectedGrade]);

  const canGoPrev = pagination?.hasPrev ?? page > 1;
  const canGoNext = pagination?.hasNext ?? subjects.length === pageSize;
  const currentPage = pagination?.currentPage ?? page;
  const totalPages = pagination?.totalPages ?? page;
  const totalSubjects = pagination?.totalCount ?? subjects.length;
  const startRow = totalSubjects === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalSubjects);

  return (
    <main className="min-h-full bg-[#edf6f8] px-6 py-6">
      <div className="mb-7 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#24272a]">Syllabus</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#155966] px-5 text-sm font-semibold text-white transition hover:bg-[#104a55]"
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      <section className="mb-5 flex min-h-[66px] flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-5 shadow-sm">
        <label className="relative block w-full max-w-[360px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2a8]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by subjects, chapter or topic..."
            className="h-9 w-full rounded-full border border-[#d9dfe2] bg-[#f8f8fa] pl-10 pr-4 text-xs text-slate-700 outline-none placeholder:text-[#8f989e] focus:border-[#155966] focus:bg-white"
          />
        </label>

        <div className="flex items-center gap-3">
          <SubjectCodeDropdown
            options={allSubjectNames}
            value={selectedCode}
            onChange={(code) => {
              setSelectedCode(code);
              setPage(1);
            }}
          />

          <label className="relative block w-[140px]">
            <select
              value={selectedGradeId}
              onChange={(event) => {
                setSelectedGradeId(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full appearance-none rounded border border-[#cbd3d7] bg-white px-3 pr-8 text-xs text-[#5d666b] outline-none focus:border-[#155966]"
            >
              <option value="">All Classes</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5d666b]"
            />
          </label>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-white py-20 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Loading syllabus...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && subjects.length === 0 && (
        <div className="rounded-lg bg-white py-20 text-center text-sm text-slate-500">
          No subjects found.
        </div>
      )}

      {!loading && !error && subjects.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              {subjects.map((subject) =>
                subject.id === expandedSubjectId ? (
                  <ExpandedSubject
                    key={subject.id}
                    subject={subject}
                    onToggle={() => setExpandedSubjectId(null)}
                  />
                ) : (
                  <CollapsedSubject
                    key={subject.id}
                    subject={subject}
                    onToggle={() => setExpandedSubjectId(subject.id)}
                  />
                )
              )}
            </div>

            <ProgressOverview subjects={subjects} />
          </div>

          {(pagination || subjects.length === pageSize || page > 1) && (
            <PaginationControls
              className="mt-5 rounded-lg bg-white px-5 py-3 shadow-sm"
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 20, 50]}
              onRowsPerPageChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
              rangeLabel={`${startRow}-${endRow} of ${totalSubjects}`}
              currentPage={currentPage}
              totalPages={totalPages}
              hasPrev={canGoPrev}
              hasNext={canGoNext}
              onPrev={() => setPage((value) => Math.max(value - 1, 1))}
              onNext={() => setPage((value) => value + 1)}
            />
          )}
        </>
      )}

      {showAddModal && (
        <AddSubjectModal
          boards={boards}
          grades={grades}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setPage(1);
            setReloadKey((value) => value + 1);
          }}
        />
      )}
    </main>
  );
}
