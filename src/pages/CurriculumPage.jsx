import { Link } from "react-router-dom";
import { MonitorPlay, List, BookMarked } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";

const sections = [
    { label: "Education Boards", desc: "Boards and their grade levels.", icon: MonitorPlay, path: "/curriculum/education-boards" },
    { label: "Subjects", desc: "Subjects offered per board and grade.", icon: List, path: "/curriculum/subjects" },
    { label: "Syllabus", desc: "Textbooks, chapters, and topic concepts.", icon: BookMarked, path: "/curriculum/syllabus" },
];

export default function CurriculumPage() {
    return (
        <div className="ty-page-shell">
            <Breadcrumb items={[{ label: "Curriculum Management" }]} />
            <PageHeader
                title="Curriculum Management"
                subtitle="Define boards, subjects, and the syllabus students learn from."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map(({ label, desc, icon: Icon, path }) => (
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
        </div>
    );
}
