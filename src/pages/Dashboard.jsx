import { ClipboardList, Trophy, UserCheck, Users } from "lucide-react";
import QuickActions from "../components/Dashboard/QuickActions";
import StatCard from "../components/Dashboard/StatCard";
import UpcomingTasks from "../components/Dashboard/UpcomingTasks";

function Dashboard() {
  const stats = [
    {
      title: "Total Students",
      value: 120,
      Icon: Users,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-500",
    },
    {
      title: "Active Students",
      value: 85,
      Icon: UserCheck,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-500",
    },
    {
      title: "Quizzes Assigned",
      value: 12,
      Icon: ClipboardList,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-500",
    },
    {
      title: "Top Performers",
      value: 10,
      Icon: Trophy,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-500",
    },
  ];

  return (
    <section className="ty-page-shell space-y-6">
      <h1 className="ty-page-title">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            Icon={stat.Icon}
            iconBg={stat.iconBg}
            iconColor={stat.iconColor}
          />
        ))}
      </div>

      <QuickActions />
      <UpcomingTasks />
    </section>
  );
}

export default Dashboard;
