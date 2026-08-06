import { useRef, useState } from "react";
import { formatINR } from "../../../lib/currency";

const LINE = "#155966";
const SURFACE = "#ffffff";
const GRID = "#eef0f2";
const AXIS_TEXT = "#8b939b";

// Fixed viewBox, scaled to the container. Strokes carry
// vector-effect="non-scaling-stroke" so the 2px line stays 2px at any width
// rather than thinning out as the card grows.
const W = 760;
const H = 240;
const PAD = { top: 16, right: 20, bottom: 30, left: 62 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Round a max up to a clean 1 / 2 / 5 × 10ⁿ so the axis ticks read as numbers
 *  a person would actually say out loud. */
function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function compactINR(paise) {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 1e7) return `₹${(rupees / 1e7).toFixed(1)}Cr`;
  if (Math.abs(rupees) >= 1e5) return `₹${(rupees / 1e5).toFixed(1)}L`;
  if (Math.abs(rupees) >= 1000) return `₹${Math.round(rupees / 1000)}K`;
  return `₹${Math.round(rupees)}`;
}

function shortLabel(label, granularity) {
  if (!label) return "";
  if (granularity === "monthly") {
    const [year, month] = label.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return Number.isNaN(date.getTime())
      ? label
      : date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  const date = new Date(label);
  return Number.isNaN(date.getTime())
    ? label
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/**
 * Collection over time — a single series, so no legend: the card title already
 * says what's plotted, and a one-swatch legend would just restate it.
 *
 * Values are read from the y-axis and the hover tooltip; only the final point is
 * directly labelled. A number on every point is noise and goes unread.
 */
export default function TrendChart({ buckets = [], granularity = "daily" }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  if (buckets.length === 0) return null;

  const max = niceMax(Math.max(...buckets.map((b) => b.total), 0));
  const stepX = buckets.length > 1 ? PLOT_W / (buckets.length - 1) : 0;

  const pointAt = (index) => {
    const bucket = buckets[index];
    return {
      x: PAD.left + (buckets.length > 1 ? index * stepX : PLOT_W / 2),
      y: PAD.top + PLOT_H - (bucket.total / max) * PLOT_H,
    };
  };

  const points = buckets.map((_, index) => pointAt(index));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + PLOT_H} L${points[0].x},${PAD.top + PLOT_H} Z`;

  const ticks = [0, 0.5, 1].map((fraction) => ({
    value: max * fraction,
    y: PAD.top + PLOT_H - fraction * PLOT_H,
  }));

  // Thin the x labels so they never collide, always keeping the first and last.
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));
  const lastIndex = buckets.length - 1;

  function handleMove(event) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relativeX = ((event.clientX - rect.left) / rect.width) * W - PAD.left;
    const index = stepX > 0 ? Math.round(relativeX / stepX) : 0;
    setHoverIndex(Math.min(Math.max(index, 0), lastIndex));
  }

  const hovered = hoverIndex === null ? null : buckets[hoverIndex];
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex];
  const endPoint = points[lastIndex];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Collection by ${granularity === "monthly" ? "month" : "day"}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Recessive hairline grid — solid, never dashed. */}
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke={GRID}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="11"
              fill={AXIS_TEXT}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {compactINR(tick.value)}
            </text>
          </g>
        ))}

        {/* Area wash at ~10% — a tint under the line, never a saturated block. */}
        <path d={areaPath} fill={LINE} fillOpacity="0.1" />
        <path
          d={linePath}
          fill="none"
          stroke={LINE}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            x2={hoveredPoint.x}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke={LINE}
            strokeWidth="1"
            strokeOpacity="0.35"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* End marker: r=4 (8px) with a 2px surface ring so it stays legible
            where it sits on the line. */}
        <circle cx={endPoint.x} cy={endPoint.y} r="4" fill={LINE} stroke={SURFACE} strokeWidth="2" />
        {hoveredPoint && hoverIndex !== lastIndex && (
          <circle
            cx={hoveredPoint.x}
            cy={hoveredPoint.y}
            r="4"
            fill={LINE}
            stroke={SURFACE}
            strokeWidth="2"
          />
        )}

        {buckets.map((bucket, index) =>
          index % labelEvery === 0 || index === lastIndex ? (
            <text
              key={bucket.key}
              x={points[index].x}
              y={H - 10}
              textAnchor={index === lastIndex ? "end" : index === 0 ? "start" : "middle"}
              fontSize="11"
              fill={AXIS_TEXT}
            >
              {shortLabel(bucket.label, granularity)}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-[#e3e9ec] bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(hoveredPoint.x / W) * 100}%`,
            top: `${(hoveredPoint.y / H) * 100}%`,
          }}
        >
          <p className="font-semibold text-[#20242a]">{shortLabel(hovered.label, granularity)}</p>
          <p className="mt-0.5 tabular-nums text-[#155966]">{formatINR(hovered.total / 100)}</p>
          <p className="text-[#8b939b]">
            {hovered.count} payment{hovered.count === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
