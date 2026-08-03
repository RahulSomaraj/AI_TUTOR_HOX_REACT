import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Settings2, Trash2, X } from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import SearchInput from "../components/ui/SearchInput";
import SearchableSelect from "../components/ui/SearchableSelect";
import DataTable from "../components/ui/DataTable";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SchoolModal from "../components/Schools/SchoolModal";
import SchoolDeleteMessage from "../components/Schools/SchoolDeleteMessage";
import { extractList, extractPagination, safeId } from "../api/normalize";
import { deleteSchool, fetchSchools } from "../api/services/schools";
import { fetchBoards } from "../api/services/catalog";

const PAGE_SIZE = 10;

function extractSchools(response) {
  return extractList(response, ["schools"]);
}

function extractBoards(response) {
  return extractList(response, ["boards", "educationBoards"]);
}

function mapBoardOption(board) {
  return {
    id: safeId(board?.id ?? board?._id ?? board?.boardId),
    name: board?.name ?? board?.boardName ?? "Board",
  };
}

function mapSchoolRow(school, boardOptions = []) {
  const boardId = safeId(school?.boardId ?? school?.board?.id ?? school?.board?._id);
  const matchedBoard = boardOptions.find((board) => board.id === boardId);

  return {
    id: safeId(school?.id ?? school?._id ?? school?.schoolId),
    rowId:
      safeId(school?.id ?? school?._id ?? school?.schoolId ?? school?.schoolCode) ||
      crypto.randomUUID(),
    name: school?.schoolName ?? school?.name ?? "Not available",
    address: school?.address ?? "",
    boardId: boardId || safeId(matchedBoard?.id),
    boardName:
      school?.board?.name ??
      school?.boardName ??
      school?.board ??
      matchedBoard?.name ??
      "Not available",
    schoolCode: school?.schoolCode ?? school?.code ?? "",
    image: (() => {
      const raw = school?.image;
      if (Array.isArray(raw)) return raw[0] ?? "";
      if (typeof raw === "string" && raw) return raw;
      return (
        school?.schoolImage ??
        school?.imageUrl ??
        school?.logo ??
        school?.thumbnail ??
        ""
      );
    })(),
  };
}

function getSearchParams(searchTerm) {
  const value = searchTerm.trim();

  if (!value) return {};

  const looksLikeCode = /^[a-z]+\d+$/i.test(value);
  return looksLikeCode ? { schoolCode: value } : { schoolName: value };
}

const BOARD_DROPDOWN_LIMIT = 10;

async function fetchAllBoardPages(query = "") {
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetchBoards({
      page,
      limit: BOARD_DROPDOWN_LIMIT,
      name: query || undefined,
    });
    const list = extractBoards(res);
    all = [...all, ...list];
    if (list.length < BOARD_DROPDOWN_LIMIT) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

function useBoardSearch() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback((query = "") => {
    setLoading(true);
    fetchAllBoardPages(query)
      .then((list) =>
        setBoards(
          list
            .map(mapBoardOption)
            .filter((board) => board.id)
            .map((board) => ({ value: board.id, label: board.name }))
        )
      )
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  }, []);

  return { boards, loading, search };
}

function BoardFilter({ value, onChange }) {
  const { boards, loading, search } = useBoardSearch();

  const allOption = { value: "", label: "All Board" };
  const options = [allOption, ...boards];
  const selectedOption = value
    ? boards.find((b) => b.value === value) ?? { value, label: "Board selected" }
    : allOption;

  return (
    <div className="w-full sm:w-[200px]">
      <SearchableSelect
        value={selectedOption}
        onChange={(option) => onChange(option.value)}
        onSearch={search}
        options={options}
        placeholder="All Board"
        searchPlaceholder="Search board..."
        loading={loading}
        emptyLabel="No boards found"
      />
    </div>
  );
}

export default function SchoolsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Set when the detail page redirects here after deleting an institution.
  const [flash, setFlash] = useState(() => location.state?.message ?? "");
  const [schools, setSchools] = useState([]);
  const [boardOptions, setBoardOptions] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: PAGE_SIZE,
    hasPrev: false,
    hasNext: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [boardId, setBoardId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Editing lives on the institution detail page; this list only adds.
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      order: "desc",
      boardId: boardId || undefined,
      ...getSearchParams(searchTerm),
    }),
    [boardId, page, pageSize, searchTerm]
  );

  // Consume the one-shot redirect message so a refresh or back-nav doesn't replay it.
  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadBoards() {
      try {
        const response = await fetchBoards();
        const mappedBoards = extractBoards(response).map(mapBoardOption);

        if (!cancelled) {
          setBoardOptions(mappedBoards.filter((board) => board.id));
        }
      } catch (err) {
        console.error("Failed to load boards for schools:", err);
        if (!cancelled) {
          setBoardOptions([]);
        }
      }
    }

    loadBoards();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadSchools() {
        try {
          setLoading(true);
          setError("");

          const response = await fetchSchools(queryParams);
          const mappedSchools = extractSchools(response).map((school) =>
            mapSchoolRow(school, boardOptions)
          );

          if (!cancelled) {
            setSchools(mappedSchools);
            setPagination(extractPagination(response, mappedSchools.length, pageSize));
          }
        } catch (err) {
          console.error("Error loading schools:", err);
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load schools";

          if (!cancelled) {
            setError(message);
            setSchools([]);
            setPagination(extractPagination(null, 0, pageSize));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      loadSchools();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [boardOptions, queryParams, refreshKey]);

  const totalSchools = pagination?.totalCount ?? schools.length;
  const startRow = totalSchools === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalSchools);

  function openAddModal() {
    setShowAddModal(true);
  }

  async function handleDeleteSchool() {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await deleteSchool(deleteTarget.id);
      setDeleteTarget(null);

      if (schools.length === 1 && page > 1) {
        setPage((value) => Math.max(value - 1, 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete school"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="ty-page-shell">
      <Breadcrumb items={[{ label: "Institution Management" }]} />
      <PageHeader
        title="Institution Management"
        subtitle={`${totalSchools} Institutions`}
        actionLabel="Add School"
        onAction={openAddModal}
      />

      {flash && (
        <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-600" />
          <p className="flex-1">{flash}</p>
          <button
            type="button"
            onClick={() => setFlash("")}
            className="rounded p-0.5 text-emerald-700 transition hover:bg-emerald-100"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={(next) => {
            setSearchTerm(next);
            setPage(1);
          }}
          placeholder="Search schools by name, school code..."
          className="max-w-[420px]"
        />

        <BoardFilter
          value={boardId}
          onChange={(nextId) => {
            setBoardId(nextId);
            setPage(1);
          }}
        />
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Schools
        </h2>

        <DataTable
          minWidth={920}
          rowKey={(row) => row.rowId}
          loading={loading}
          error={error}
          emptyLabel="No schools found."
          rows={schools}
          columns={[
            {
              key: "name",
              header: "School Name",
              render: (school) => (
                <button
                  type="button"
                  onClick={() => navigate(`/schools/${school.id}`)}
                  className="font-medium text-[#155966] transition hover:underline"
                >
                  {school.name}
                </button>
              ),
            },
            {
              key: "address",
              header: "Address",
              render: (school) => school.address || "Not available",
            },
            {
              key: "boardName",
              header: "Board",
              render: (school) => school.boardName,
            },
            {
              key: "schoolCode",
              header: "School Code",
              render: (school) => school.schoolCode || "Not available",
            },
            {
              key: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              render: (school) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/schools/${school.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#155966] px-3 py-1.5 text-[13px] font-semibold text-[#155966] transition hover:bg-[#155966] hover:text-white"
                  >
                    <Settings2 size={14} strokeWidth={2} />
                    Manage
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(school)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#d14343] transition hover:border-red-200 hover:bg-red-50"
                    aria-label={`Delete ${school.name}`}
                    title={`Delete ${school.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />

        {!loading && !error && schools.length > 0 && (
          <PaginationControls
            className="mt-6"
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 20, 50]}
            onRowsPerPageChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            rangeLabel={`${startRow}-${endRow} of ${totalSchools}`}
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

      {showAddModal && (
        <SchoolModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Institution"
          message={<SchoolDeleteMessage schoolName={deleteTarget.name} />}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleDeleteSchool}
        />
      )}
    </div>
  );
}
