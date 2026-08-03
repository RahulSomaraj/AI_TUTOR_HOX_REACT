import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import Breadcrumb from "../components/ui/Breadcrumb";
import { fetchTopicById, updateTopicConcept } from "../api/services/topics";

function ConceptEditModal({ topic, onClose, onSuccess }) {
  const [concept, setConcept] = useState(topic.concept ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await updateTopicConcept(topic.id, concept.trim());
      onSuccess(concept.trim());
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update concept"
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
        className="w-full max-w-lg rounded-[20px] bg-white px-8 py-8 shadow-xl"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-[#20242a]">
          Edit Concept
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-[#20242a]">Concept</p>
          <textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            disabled={saving}
            rows={10}
            placeholder="Write a detailed explanation for this topic..."
            className="w-full resize-none rounded-[10px] border border-[#c7cbd1] px-4 py-3 text-sm text-[#20242a] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
          />
        </div>

        <div className="mt-6 flex gap-4">
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
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TopicDetailPage() {
  const { textbookId, chapterId, topicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [topic, setTopic] = useState(location.state?.topic ?? null);
  const [loading, setLoading] = useState(!location.state?.topic);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (topic || !topicId) return;

    let cancelled = false;

    async function loadTopic() {
      try {
        setLoading(true);
        const response = await fetchTopicById(topicId);
        const topicData = response?.data ?? response;
        if (!cancelled) setTopic(topicData);
      } catch (err) {
        console.error("Failed to load topic details:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTopic();
    return () => {
      cancelled = true;
    };
  }, [topic, topicId]);

  const chapterName = location.state?.chapter?.title ?? topic?.chapter?.title ?? "Chapter";
  const textbookName = location.state?.textbook?.title ?? topic?.textbook?.title ?? "Syllabus";

  if (loading) {
    return (
      <div className="ty-page-shell">
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#5b626a]">
          <Loader2 size={18} className="animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="ty-page-shell">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#20242a] transition hover:bg-white"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="ty-page-title">Topic Details</h1>
        </div>
        <p className="mt-6 text-sm text-[#5b626a]">Topic not found.</p>
      </div>
    );
  }

  return (
    <div className="ty-page-shell">
      <Breadcrumb
        items={[
          { label: "Curriculum Management", path: "/curriculum" },
          { label: "Syllabus", path: "/curriculum/syllabus" },
          { label: textbookName, path: `/curriculum/syllabus/${textbookId}/chapters` },
          { label: chapterName, path: `/curriculum/syllabus/${textbookId}/chapters/${chapterId}/topics` },
          { label: topic.title },
        ]}
      />

      <div className="mb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            navigate(`/curriculum/syllabus/${textbookId}/chapters/${chapterId}/topics`, {
              state: location.state,
            })
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#20242a] transition hover:bg-white"
          aria-label="Back to topics"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="ty-page-title">
          Topic Details
        </h1>
      </div>

      <p className="mb-6 pl-12 text-[18px] font-semibold text-[#20242a]">
        {topic.title}
      </p>

      <div className="rounded-[14px] bg-white px-6 py-6 shadow-[0_4px_16px_rgba(18,53,64,0.06)]">
        <h2 className="text-[18px] font-semibold text-[#20242a]">Concept</h2>
        <p className="mb-4 mt-1 text-sm text-[#5b626a]">
          Write a detailed explanation for this topic.
        </p>

        {topic.concept ? (
          <div className="whitespace-pre-line text-[15px] leading-relaxed text-[#20242a]">
            {topic.concept}
          </div>
        ) : (
          <p className="text-sm italic text-[#9aa0a8]">No concept available.</p>
        )}

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#155966] transition hover:text-[#104a55]"
        >
          <Pencil size={14} strokeWidth={2} />
          Edit
        </button>
      </div>

      {editOpen && (
        <ConceptEditModal
          topic={topic}
          onClose={() => setEditOpen(false)}
          onSuccess={(newConcept) => setTopic((t) => ({ ...t, concept: newConcept }))}
        />
      )}
    </div>
  );
}
