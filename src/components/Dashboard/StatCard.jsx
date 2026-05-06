export default function StatCard({
  title,
  value,
  Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-700",
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <h3 className="mt-3 text-2xl font-bold text-slate-900">{value}</h3>
      </div>

      <div
        className={`flex h-14 w-14 items-center justify-center rounded-3xl ${iconBg}`}
      >
        {Icon ? <Icon className={`h-6 w-6 ${iconColor}`} /> : null}
      </div>
    </div>
  );
}
