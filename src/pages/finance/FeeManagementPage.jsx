import { Link } from "react-router-dom";
import {
    Tag,
    Layers,
    ClipboardList,
    Coins,
    ReceiptText,
    BarChart3
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Breadcrumb from "../../components/ui/Breadcrumb";

const sections = [
    { label: "Fee Types", desc: "Define fee categories (Tuition, Admission, Exam...).", icon: Tag, path: "/finance/fee-types" },
    { label: "Fee Structures", desc: "Bundle fee types into class/school-scoped plans.", icon: Layers, path: "/finance/fee-structures" },
    { label: "Fee Assignment", desc: "Assign fees to a whole class or to individual students.", icon: ClipboardList, path: "/finance/fee-assignment" },
    { label: "Fee Collection", desc: "Record payments and download receipts.", icon: Coins, path: "/finance/collect" },
    { label: "Student Ledger", desc: "Running credit/debit statement per student.", icon: ReceiptText, path: "/finance/ledger" },
    { label: "Reports", desc: "Collection and outstanding summaries.", icon: BarChart3, path: "/finance/reports" }
];

export default function FeeManagementPage() {
    return (
        <div className="ty-page-shell">
            <Breadcrumb items={[{ label: "Fee Management" }]} />
            <PageHeader
                title="Fee Management"
                subtitle="Set up fees, collect payments, and track student accounts."
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