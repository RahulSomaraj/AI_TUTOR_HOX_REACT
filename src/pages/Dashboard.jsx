import { GraduationCap, School, UserCog, Users } from "lucide-react";
import QuickActions from "../components/Dashboard/QuickActions";
import StatCard from "../components/Dashboard/StatCard";
import OutstandingDues from "../components/Dashboard/OutstandingDues";
import Breadcrumb from "../components/ui/Breadcrumb";
import { useClassCountQuery, useDashboardCounts } from "../features/dashboard/useDashboard";

// Icons live here rather than in the hook so the data layer stays free of JSX.
const ICONS = {
  schools: { Icon: School, iconBg: "bg-teal-100", iconColor: "text-teal-600" },
  students: { Icon: GraduationCap, iconBg: "bg-violet-100", iconColor: "text-violet-500" },
  teachers: { Icon: UserCog, iconBg: "bg-amber-100", iconColor: "text-amber-500" },
  parents: { Icon: Users, iconBg: "bg-rose-100", iconColor: "text-rose-500" },
};

function Dashboard() {
  const counts = useDashboardCounts();
  const classCount = useClassCountQuery();

  return (
    <section className="ty-page-shell space-y-6">
      <Breadcrumb items={[]} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="ty-page-title">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {classCount.isPending || classCount.isError
            ? " "
            : `${classCount.data} class${classCount.data === 1 ? "" : "es"} across all institutions`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {counts.map(({ key, label, to, result }) => (
          <StatCard
            key={key}
            title={label}
            value={result.data ?? 0}
            to={to}
            loading={result.isPending}
            error={result.isError}
            {...ICONS[key]}
          />
        ))}
      </div>

      <QuickActions />
      <OutstandingDues />
    </section>
  );
}

export default Dashboard;
