import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * A count that links to the list it counts.
 *
 * `loading` and `error` are separate states on purpose: a dash for "couldn't
 * load" and a spinner for "still loading" say different things, and showing 0
 * for either would be a lie about the data.
 */
export default function StatCard({
  title,
  value,
  to,
  loading = false,
  error = false,
  Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-700",
}) {
  const body = (
    <>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <h3 className="mt-3 text-2xl font-bold text-slate-900">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          ) : error ? (
            <span className="text-slate-300" title="Couldn't load this count">
              —
            </span>
          ) : (
            value
          )}
        </h3>
      </div>

      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${iconBg}`}>
        {Icon ? <Icon className={`h-6 w-6 ${iconColor}`} /> : null}
      </div>
    </>
  );

  const shell =
    "flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-sm transition";

  if (!to) return <div className={shell}>{body}</div>;

  return (
    <Link to={to} className={`${shell} hover:-translate-y-0.5 hover:shadow-md`}>
      {body}
    </Link>
  );
}
