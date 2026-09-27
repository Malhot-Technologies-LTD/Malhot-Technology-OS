import { cn } from "@/lib/utils";

/**
 * Small, dependency-free charts for OS dashboards.
 *
 * Plain DOM rather than a chart library: the OS needs a column chart and a bar
 * list, both single-series, and a library would bring a bundle and a styling
 * system that fights the tokens. Colour comes from the brand token, so dark
 * mode is the theme's own step, not an inverted chart.
 *
 * Hover and keyboard focus show the same tooltip, and every value is also in a
 * visually hidden table, so nothing is reachable by pointer alone.
 */

/** A clean axis maximum: 1, 2, 5 × 10ⁿ at or above the largest value. */
export function niceMax(value: number): number {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * power >= value) return step * power;
  }
  return 10 * power;
}

export type ColumnDatum = {
  key: string;
  label: string;
  /** Shown instead of `label` on narrow screens, where columns are ~35px apart. */
  shortLabel?: string;
  /**
   * Replaces `label` under the column, "" for none. For dense charts (30 days)
   * that label every few columns; the hidden table still gets the full label.
   */
  axisLabel?: string;
  value: number;
  tooltip: string;
};

/**
 * Vertical columns from a single baseline, one series. The last column is the
 * current period and carries the only direct label; the axis carries the rest.
 */
export function ColumnChart({
  data,
  caption,
  valueHeading,
  labelHeading = "Week",
  height = 180,
}: {
  data: readonly ColumnDatum[];
  /** Names the chart for assistive technology and heads the hidden table. */
  caption: string;
  valueHeading: string;
  labelHeading?: string;
  height?: number;
}) {
  const max = niceMax(Math.max(0, ...data.map((datum) => datum.value)));
  const ticks = [max, max / 2, 0];
  const last = data.length - 1;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="flex flex-col justify-between text-right text-xs text-fg-subtle tabular-nums"
          style={{ height }}
        >
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 leading-4">
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((tick, index) => (
            <div
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <ul className="absolute inset-0 flex items-end justify-around gap-1">
            {data.map((datum, index) => {
              const percent = max === 0 ? 0 : (datum.value / max) * 100;
              return (
                <li
                  key={datum.key}
                  tabIndex={0}
                  aria-label={datum.tooltip}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {index === last && datum.value > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute text-xs font-medium text-fg tabular-nums"
                      style={{ bottom: `calc(${percent}% + 4px)` }}
                    >
                      {datum.value}
                    </span>
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-full max-w-6 rounded-t-[4px] transition-opacity duration-[120ms] group-hover:opacity-80",
                      index === last ? "bg-brand" : "bg-brand/55",
                    )}
                    style={{ height: datum.value === 0 ? 0 : `max(${percent}%, 3px)` }}
                  />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs whitespace-nowrap shadow-m group-hover:block group-focus-visible:block"
                  >
                    {datum.tooltip}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" className="flex gap-3">
        <span className="invisible text-xs tabular-nums">{max}</span>
        <div className="flex flex-1 justify-around gap-1">
          {data.map((datum) => (
            <span
              key={datum.key}
              className={cn(
                "min-w-0 flex-1 text-center text-xs text-fg-subtle",
                // A sparse label may spill into the unlabelled columns beside it.
                datum.axisLabel !== undefined ? "whitespace-nowrap" : "truncate",
              )}
            >
              {datum.axisLabel !== undefined ? (
                datum.axisLabel
              ) : (
                <>
                  <span className={datum.shortLabel ? "max-sm:hidden" : undefined}>{datum.label}</span>
                  {datum.shortLabel ? <span className="sm:hidden">{datum.shortLabel}</span> : null}
                </>
              )}
            </span>
          ))}
        </div>
      </div>
      <DataTable caption={caption} labelHeading={labelHeading} valueHeading={valueHeading} rows={data} />
    </figure>
  );
}

export type BarDatum = { key: string; label: string; value: number };

/**
 * Horizontal bars with the value at each tip. For a handful of categories,
 * where every value is worth reading, so every bar is labelled.
 */
export function BarList({
  data,
  caption,
  labelHeading,
  valueHeading,
}: {
  data: readonly BarDatum[];
  caption: string;
  labelHeading: string;
  valueHeading: string;
}) {
  const max = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <figure>
      <ul aria-hidden="true" className="flex flex-col gap-3">
        {data.map((datum) => {
          return (
            <li key={datum.key} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="truncate text-fg-muted">{datum.label}</span>
              <span className="h-2.5 rounded-full bg-bg-subtle">
                <span
                  className="block h-full rounded-full bg-brand transition-[width] duration-[240ms] ease-standard"
                  style={{ width: datum.value === 0 ? 0 : `max(${(datum.value / max) * 100}%, 6px)` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">{datum.value}</span>
            </li>
          );
        })}
      </ul>
      <DataTable caption={caption} labelHeading={labelHeading} valueHeading={valueHeading} rows={data} />
    </figure>
  );
}

function DataTable({
  caption,
  labelHeading,
  valueHeading,
  rows,
}: {
  caption: string;
  labelHeading: string;
  valueHeading: string;
  rows: readonly { key: string; label: string; value: number }[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{labelHeading}</th>
          <th scope="col">{valueHeading}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type LineSeries = {
  key: string;
  label: string;
  values: readonly number[];
  /** Tailwind stroke/fill classes; the first series is the one that matters. */
  strokeClass: string;
  swatchClass: string;
  dashed?: boolean;
};

/**
 * Lines over shared points, for cumulative series like a burn-up. The SVG
 * stretches to the width it is given; strokes stay crisp because they do not
 * scale with it. Hovering or focusing a column shows every series' value there.
 */
export function LineChart({
  labels,
  series,
  caption,
  height = 220,
}: {
  labels: readonly { key: string; label: string; shortLabel?: string; tooltip: string }[];
  series: readonly LineSeries[];
  caption: string;
  height?: number;
}) {
  const max = niceMax(Math.max(0, ...series.flatMap((line) => line.values)));
  const ticks = [max, max / 2, 0];
  const count = labels.length;
  const x = (index: number) => (count <= 1 ? 50 : (index / (count - 1)) * 100);
  const y = (value: number) => (max === 0 ? 100 : 100 - (value / max) * 100);

  return (
    <figure className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-4 text-xs text-fg-muted" aria-hidden="true">
        {series.map((line) => (
          <li key={line.key} className="flex items-center gap-1.5">
            <span className={cn("h-0.5 w-4 rounded-full", line.swatchClass)} />
            {line.label}
            <span className="font-medium text-fg tabular-nums">{line.values[line.values.length - 1] ?? 0}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="flex flex-col justify-between text-right text-xs text-fg-subtle tabular-nums"
          style={{ height }}
        >
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 leading-4">
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((tick, index) => (
            <div
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {series.map((line) => (
              <polyline
                key={line.key}
                fill="none"
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={line.dashed ? "5 4" : undefined}
                className={line.strokeClass}
                points={line.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
              />
            ))}
          </svg>
          <ul className="absolute inset-0 flex">
            {labels.map((label) => (
              <li
                key={label.key}
                tabIndex={0}
                aria-label={label.tooltip}
                className="group relative flex-1 rounded-sm outline-none hover:bg-bg-subtle/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-2 left-1/2 z-10 hidden -translate-x-1/2 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs whitespace-nowrap shadow-m group-hover:block group-focus-visible:block"
                >
                  {label.tooltip}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" className="flex gap-3">
        <span className="invisible text-xs tabular-nums">{max}</span>
        <div className="flex flex-1 justify-between">
          {labels.map((label, index) =>
            index % Math.max(1, Math.ceil(count / 6)) === 0 || index === count - 1 ? (
              <span key={label.key} className="text-xs text-fg-subtle">
                {label.label}
              </span>
            ) : null,
          )}
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            {series.map((line) => (
              <th key={line.key} scope="col">
                {line.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => (
            <tr key={label.key}>
              <th scope="row">{label.label}</th>
              {series.map((line) => (
                <td key={line.key}>{line.values[index] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
