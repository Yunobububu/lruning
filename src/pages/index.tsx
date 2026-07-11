import { useMemo, useState, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import Layout from '@/components/Layout';
import { Link } from 'react-router-dom';
import RunMap from '@/components/RunMap';
import RunTable from '@/components/RunTable';
import useActivities from '@/hooks/useActivities';
import racesData from '@/static/races.json';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import {
  Activity,
  filterAndSortRuns,
  sortDateFunc,
  filterYearRuns,
  titleForRun,
  formatPace,
  geoJsonForRuns,
  getBoundsForGeoData,
  IViewState,
  RunIds,
} from '@/utils/utils';
import { M_TO_DIST } from '@/utils/utils';

/* ── helpers ───────────────────────────────────── */

const totalDist = (acts: Activity[]) =>
  acts.reduce((s, a) => s + a.distance, 0);

const totalSec = (acts: Activity[]) =>
  acts.reduce((s, a) => {
    const [h, m, sec] = a.moving_time.split(':').map(Number);
    return s + (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
  }, 0);

const fmtHours = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

const nowYear = String(new Date().getFullYear());
const nowMonth = String(new Date().getMonth() + 1).padStart(2, '0');

/* ── staggered animation variants ──────────────── */

const containerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.03 } },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};

/* ── stat card component ──────────────────────── */

const StatCard = ({
  label,
  value,
  unit,
  goal,
  subLeft,
  subRight,
  vs,
  twoLines,
}: {
  label: string;
  value: string;
  unit: string;
  goal?: number;
  subLeft?: string;
  subRight?: string;
  vs?: { diff: number; up: boolean } | null;
  twoLines?: boolean;
}) => {
  const pct = goal ? Math.min(100, (parseFloat(value) / goal) * 100) : 0;
  return (
    <div className="rounded-2xl glass-card p-5 sm:p-6 glass-card-interactive shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white sm:text-2xl whitespace-nowrap">
        {value}
        <span className="ml-1 text-lg font-medium text-zinc-400">{unit}</span>
      </p>
      {goal !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {(subLeft || subRight) && (
        <div className={`mt-2 text-xs text-zinc-500 ${twoLines ? 'flex flex-col gap-4' : 'flex items-center justify-between'}`}>
          {subLeft && <span>{subLeft}</span>}
          {subRight && <span>{subRight}</span>}
        </div>
      )}
      {vs && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className={vs.up ? 'text-green-400' : 'text-red-400'}>
            {vs.up ? '↗' : '↘'}
          </span>
          <span className="text-zinc-400">
            {vs.diff > 0 ? '+' : ''}{vs.diff} km vs {label === 'YEARLY GOAL' ? '去年同期' : '上月同期'}
          </span>
        </div>
      )}
    </div>
  );
};

/* ── mini route preview ───────────────────────── */

const MiniRoute = ({ pl }: { pl: string }) => {
  const pathD = useMemo(() => {
    if (!pl) return '';
    const coords: [number, number][] = [];
    let i = 0, lat = 0, lng = 0;
    while (i < pl.length) {
      let shift = 0, result = 0;
      while (true) { const b = pl.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; if (b < 0x20) break; }
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      while (true) { const b = pl.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; if (b < 0x20) break; }
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      coords.push([lng / 1e5, lat / 1e5]);
    }
    if (coords.length < 2) return '';
    const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1]);
    const minL = Math.min(...lngs), maxL = Math.max(...lngs);
    const minA = Math.min(...lats), maxA = Math.max(...lats);
    const w = 28, h = 24, pad = 2;
    const scaleX = (w - pad * 2) / (maxL - minL || 1);
    const scaleY = (h - pad * 2) / (maxA - minA || 1);
    const scale = Math.min(scaleX, scaleY);
    const cx = w / 2 - ((maxL + minL) / 2 - minL) * scale - pad;
    const cy = h / 2 - ((maxA + minA) / 2 - minA) * scale - pad;
    const pts = coords.map(([l, a]) => `${(l - minL) * scale + pad},${h - ((a - minA) * scale + pad)}`);
    return `M${pts.join(' L')}`;
  }, [pl]);

  if (!pathD) return <span className="text-[10px] text-zinc-500">—</span>;
  return (
    <svg width="28" height="24" viewBox="0 0 28 24" className="block">
      <path d={pathD} fill="none" stroke="#E31937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── calendar widget ──────────────────────────── */

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CalendarWidget = ({
  year,
  month,
  activities,
  onPrevMonth,
  onNextMonth,
  view,
  onToggleView,
  selectedDate,
  onSelectDate,
  monthKm,
}: {
  year: string;
  month: string;
  activities: Activity[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  view: 'calendar' | 'route';
  onToggleView: () => void;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  monthKm: string;
}) => {
  const runDates = useMemo(() => {
    const s = new Map<string, { km: number; polyline: string | null }>();
    activities
      .filter((a) => a.start_date_local.startsWith(`${year}-${month}`))
      .forEach((a) => {
        const d = a.start_date_local.slice(8, 10);
        const prev = s.get(d);
        s.set(d, {
          km: (prev?.km || 0) + a.distance / 1000,
          polyline: prev?.polyline || a.summary_polyline || null,
        });
      });
    return s;
  }, [activities, year, month]);

  const daysInMonth = new Date(+year, +month, 0).getDate();
  const firstDay = new Date(+year, +month - 1, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-2xl glass-card p-5 shadow-card">
      {/* Header: arrows + icons on left, month/year km on right */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={onPrevMonth} className="btn-press text-zinc-400 hover:text-white text-lg leading-none px-1">&#8249;</button>
          <button onClick={onNextMonth} className="btn-press text-zinc-400 hover:text-white text-lg leading-none px-1">&#8250;</button>
          <button
            onClick={onToggleView}
            title="Calendar view"
            className={`w-7 h-7 flex items-center justify-center rounded transition ml-1 ${
              view === 'calendar' ? 'bg-accent' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="11" rx="1" stroke="white" strokeWidth="1.5"/>
              <line x1="2" y1="7" x2="14" y2="7" stroke="white" strokeWidth="1.5"/>
              <line x1="6" y1="3" x2="6" y2="7" stroke="white" strokeWidth="1.5"/>
              <line x1="10" y1="3" x2="10" y2="7" stroke="white" strokeWidth="1.5"/>
            </svg>
          </button>
          <button
            onClick={onToggleView}
            title="Route view"
            className={`w-7 h-7 flex items-center justify-center rounded transition ${
              view === 'route' ? 'bg-accent' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 4l4-3 4 3 4-3 2 1v10l-2-1-4 3-4-3-4 3-1-1V5z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="5" cy="6.5" r="1" fill="white"/>
            </svg>
          </button>
        </div>
        <span className="text-lg font-bold text-white">
          {month}/{year}
          <span className="ml-2 text-base font-normal text-white/80">{monthKm} km</span>
        </span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-[11px] font-medium text-zinc-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((day, i) => {
          if (day === null)
            return <div key={`e${i}`} className="w-10 h-10 mx-auto" />;
          const ds = String(day).padStart(2, '0');
          const dateStr = `${year}-${month}-${ds}`;
          const km = runDates.get(ds);
          const isSelected = selectedDate === dateStr;
          return (
            <div
              key={day}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={`flex flex-col items-center justify-center w-10 h-10 mx-auto rounded-lg cursor-pointer text-xs transition ${
                isSelected
                  ? 'bg-zinc-700 text-white'
                  : km
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-800/50'
              }`}
            >
              {view === 'route' && km?.polyline && !isSelected ? (
                <div className="cursor-pointer group">
                  <span className="group-hover:hidden block"><MiniRoute pl={km.polyline} /></span>
                  <span className="hidden group-hover:flex flex-col items-center text-white">
                    <span className="font-semibold">{day}</span>
                    <span className="text-zinc-400 text-[10px]">{km.km.toFixed(1)} km</span>
                  </span>
                </div>
              ) : (
                <>
                  <span className={km ? 'font-semibold' : ''}>{day}</span>
                  {km !== undefined && (view === 'calendar' || isSelected) && (
                    <span className="text-zinc-400 mt-0.5">{km.km.toFixed(1)}</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── main dashboard ───────────────────────────── */

const Index = () => {
  const { siteTitle } = useSiteMetadata();
  const { activities, years } = useActivities();
  const [year, setYear] = useState(nowYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [page, setPage] = useState(1);
  const PER_PAGE = 16;
  const [calendarMonth, setCalendarMonth] = useState(nowMonth);
  const [calendarYear, setCalendarYear] = useState(nowYear);
  const [calendarView, setCalendarView] = useState<'calendar' | 'route'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // filter by selected year (or all)
  const yearRuns = useMemo(
    () =>
      filterAndSortRuns(
        activities as Activity[],
        year,
        year === 'Total' ? () => true : filterYearRuns,
        sortDateFunc
      ),
    [activities, year]
  );

  // geo data for map — all routes for selected year/Total
  const mapGeoData = useMemo(
    () => geoJsonForRuns(yearRuns as any),
    [yearRuns]
  );

  // view state for map auto-zoom
  const bounds = useMemo(() => getBoundsForGeoData(mapGeoData as any), [mapGeoData]);
  const [viewState, setViewState] = useState<IViewState>(() => ({ ...bounds }));
  const [animatedGeoData, setAnimatedGeoData] = useState(mapGeoData);

  // update view state when year changes
  useEffect(() => {
    setViewState({ ...bounds });
    setAnimatedGeoData(mapGeoData);
  }, [bounds, mapGeoData]);

  // locateActivity: zoom map to selected run(s)
  const locateActivity = useCallback(
    (runIds: RunIds) => {
      const ids = new Set(runIds);
      const selectedRuns = !runIds.length
        ? (yearRuns as Activity[])
        : (yearRuns as Activity[]).filter((r: any) => ids.has(r.run_id));
      if (!selectedRuns.length) return;

      const selectedGeoData = geoJsonForRuns(selectedRuns as any);
      const selectedBounds = getBoundsForGeoData(selectedGeoData as any);
      // zoom in one more level for single/multi-day views
      selectedBounds.zoom = (selectedBounds.zoom || 11) - 2;

      setAnimatedGeoData(selectedGeoData);
      setViewState({ ...selectedBounds });

      if (runIds.length === 1) {
        setRunIndex((yearRuns as Activity[]).findIndex((r: any) => r.run_id === runIds[0]));
      } else {
        setRunIndex(-1);
      }

      const mapEl = document.getElementById('map-container');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [yearRuns]
  );

  // when calendar date clicked, zoom map to that day's runs
  useEffect(() => {
    if (!selectedDate) return;
    const runIds = (yearRuns as Activity[])
      .filter((r) => r.start_date_local.startsWith(selectedDate))
      .map((r) => r.run_id);
    if (runIds.length) locateActivity(runIds);
  }, [selectedDate]);

  // stats
  const totalKm = useMemo(
    () => (totalDist(activities as Activity[]) / 1000).toFixed(1),
    [activities]
  );
  const totalRuns = activities.length;
  const totalHours = useMemo(
    () => fmtHours(totalSec(activities as Activity[])),
    [activities]
  );

  const yearKm = useMemo(
    () => (totalDist(yearRuns) / 1000).toFixed(1),
    [yearRuns]
  );
  const yearRunsCount = yearRuns.length;
  const yearHours = useMemo(() => fmtHours(totalSec(yearRuns)), [yearRuns]);

  // independent year/month stats (not affected by year filter)
  const thisYearRuns = useMemo(
    () => (activities as Activity[]).filter((a) => a.start_date_local.startsWith(nowYear)),
    [activities]
  );
  const thisYearKm = useMemo(() => (totalDist(thisYearRuns) / 1000).toFixed(1), [thisYearRuns]);
  const thisYearCount = thisYearRuns.length;
  const thisYearHours = useMemo(() => fmtHours(totalSec(thisYearRuns)), [thisYearRuns]);

  const thisMonthRuns = useMemo(
    () => (activities as Activity[]).filter((a) => a.start_date_local.startsWith(`${nowYear}-${nowMonth}`)),
    [activities]
  );
  const thisMonthKm = useMemo(() => (totalDist(thisMonthRuns) / 1000).toFixed(1), [thisMonthRuns]);
  const thisMonthCount = thisMonthRuns.length;
  const thisMonthHours = useMemo(() => fmtHours(totalSec(thisMonthRuns)), [thisMonthRuns]);

  const monthRuns = useMemo(
    () =>
      yearRuns.filter((a) => a.start_date_local.startsWith(`${year}-${nowMonth}`)),
    [yearRuns, year]
  );
  const monthKm = useMemo(
    () => (totalDist(monthRuns) / 1000).toFixed(1),
    [monthRuns]
  );
  const monthRunsCount = monthRuns.length;
  const monthHours = useMemo(() => fmtHours(totalSec(monthRuns)), [monthRuns]);

  // comparison stats (independent of year filter)
  const yearVsLastYear = useMemo(() => {
    const thisYr = (activities as Activity[]).filter((a) => {
      const m = parseInt(a.start_date_local.slice(5, 7), 10);
      return a.start_date_local.startsWith(nowYear) && m <= parseInt(nowMonth);
    });
    const lastYr = (activities as Activity[]).filter((a) => {
      const m = parseInt(a.start_date_local.slice(5, 7), 10);
      return a.start_date_local.startsWith(String(parseInt(nowYear) - 1)) && m <= parseInt(nowMonth);
    });
    const diff = (totalDist(thisYr) - totalDist(lastYr)) / 1000;
    return { diff: Math.round(diff * 10) / 10, up: diff >= 0 };
  }, [activities]);

  const monthVsLastMonth = useMemo(() => {
    const thisM = (activities as Activity[]).filter((a) =>
      a.start_date_local.startsWith(`${nowYear}-${nowMonth}`)
    );
    const prevM = String(parseInt(nowMonth) - 1 || 12).padStart(2, '0');
    const prevY = parseInt(nowMonth) === 1 ? String(parseInt(nowYear) - 1) : nowYear;
    const lastM = (activities as Activity[]).filter((a) =>
      a.start_date_local.startsWith(`${prevY}-${prevM}`)
    );
    const diff = (totalDist(thisM) - totalDist(lastM)) / 1000;
    return { diff: Math.round(diff * 10) / 10, up: diff >= 0 };
  }, [activities]);

  // marathon count this year (from race API data)
  const marathonCount = useMemo(
    () => year === 'Total'
      ? (racesData.races as any[]).length
      : (racesData.races as any[]).filter((r: any) => r.date.startsWith(year)).length,
    [year]
  );

  // latest finished race
  const latestMarathon = useMemo(() => {
    const sorted = [...(racesData.races as any[])].sort((a: any, b: any) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  }, []);

  // limited runs for display (paginated, 16 per page)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(yearRuns.length / PER_PAGE)), [yearRuns]);
  const displayRuns = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return yearRuns.slice(start, start + PER_PAGE);
  }, [yearRuns, page]);

  // reset page when year changes
  useEffect(() => { setPage(1); }, [year]);

  // calendar month navigation
  const handlePrevMonth = useCallback(() => {
    const m = parseInt(calendarMonth) - 1;
    if (m < 1) {
      setCalendarMonth('12');
      setCalendarYear(String(parseInt(calendarYear) - 1));
    } else {
      setCalendarMonth(String(m).padStart(2, '0'));
    }
  }, [calendarMonth, calendarYear]);

  const handleNextMonth = useCallback(() => {
    const m = parseInt(calendarMonth) + 1;
    if (m > 12) {
      setCalendarMonth('01');
      setCalendarYear(String(parseInt(calendarYear) + 1));
    } else {
      setCalendarMonth(String(m).padStart(2, '0'));
    }
  }, [calendarMonth, calendarYear]);

  // calendar month km
  const calendarMonthKm = useMemo(() => {
    const t = (activities as Activity[])
      .filter((a) => a.start_date_local.startsWith(`${calendarYear}-${calendarMonth}`))
      .reduce((s, a) => s + a.distance, 0);
    return (t / 1000).toFixed(1);
  }, [activities, calendarYear, calendarMonth]);

  // monthly distance data for bar chart
  const monthlyChartData = useMemo(() => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return months.map((m, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const km = (activities as Activity[])
        .filter((a) => a.start_date_local.startsWith(`${year}-${mm}`))
        .reduce((s, a) => s + a.distance / 1000, 0);
      return { month: m, km: Math.round(km * 10) / 10 };
    });
  }, [activities, year]);

  const setActivity = useCallback((_runs: Activity[]) => {}, []);

  return (
    <Layout>
      <Helmet>
        <html lang="zh-CN" data-theme="dark" />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8 lg:pt-12">

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 items-stretch">
          {/* ── LEFT COLUMN ────────────────────── */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Stats cards — staggered entrance */}
            <motion.div
              className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
              variants={containerStagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUpItem}>
                <Link to="/tracks" className="group relative block rounded-2xl overflow-hidden shadow-lift">
                  <StatCard
                    label="TOTAL DISTANCE"
                    value={totalKm}
                    unit="km"
                    subLeft={`⚡ ${totalRuns} runs`}
                    subRight={`🕒 ${totalHours}`}
                    twoLines
                  />
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                    <span className="text-white text-lg font-medium border-b-2 border-red-500 pb-0.5">
                      点击打开轨迹墙
                    </span>
                  </div>
                </Link>
              </motion.div>
              <motion.div variants={fadeUpItem}>
                <StatCard
                  label="YEARLY GOAL"
                  value={thisYearKm}
                  unit="/ 1000 km"
                  goal={1000}
                  subLeft={`${thisYearCount} runs`}
                  subRight={thisYearHours}
                  vs={yearVsLastYear}
                />
              </motion.div>
              <motion.div variants={fadeUpItem}>
                <StatCard
                  label="MONTHLY GOAL"
                  value={thisMonthKm}
                  unit="/ 150 km"
                  goal={150}
                  subLeft={`${thisMonthCount} runs`}
                  subRight={thisMonthHours}
                  vs={monthVsLastMonth}
                />
              </motion.div>
            </motion.div>

            {/* Activity Log */}
            <div className="rounded-2xl glass-card p-5 mt-auto shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Activity Log</h2>
                <span className="text-sm text-zinc-500">
                  Showing {yearRuns.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, yearRuns.length)} of {yearRuns.length}
                </span>
              </div>

              {/* Year filter chips */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setYear('Total')}
                  className={`btn-press rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                    year === 'Total'
                      ? 'bg-accent text-white shadow-sm shadow-accent/30'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setYear(nowYear)}
                  className={`btn-press rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                    year === nowYear
                      ? 'bg-accent text-white shadow-sm shadow-accent/30'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {nowYear}
                </button>
                {years
                  .filter((y) => y !== nowYear)
                  .slice(0, 6)
                  .map((y) => (
                    <button
                      onClick={() => setYear(y)}
                      className={`btn-press rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                        year === y
                          ? 'bg-accent text-white shadow-sm shadow-accent/30'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
              </div>

              <RunTable
                runs={displayRuns}
                locateActivity={locateActivity}
                setActivity={setActivity}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
              />

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`text-sm font-medium transition ${
                    page === 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ‹ Prev
                </button>
                <span className="text-sm text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`text-sm font-medium transition ${
                    page === totalPages ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN — staggered sections ── */}
          <motion.div
            className="lg:col-span-2 flex flex-col space-y-4"
            variants={containerStagger}
            initial="hidden"
            animate="show"
          >
            {/* Marathon Events */}
            <motion.div variants={fadeUpItem}>
            <div className="rounded-2xl glass-card p-5 glass-card-interactive shadow-card">
              <div className="flex items-stretch gap-0">
                {/* Left: count + labels */}
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-black text-accent">{marathonCount}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">MARATHON<br/>EVENTS</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">IN {year === 'All' ? 'ALL' : year}</p>
                  </div>
                </div>
                {/* Divider + right: only if there's a marathon */}
                {latestMarathon && (
                  <>
                    <div className="w-px bg-zinc-700 mx-3" />
                    <Link to="/races/0" className="flex-1 min-w-0 pl-2 block hover:opacity-80 transition">
                      <span className="inline-flex items-center gap-1 rounded bg-red-900/60 px-2 py-0.5 text-[10px] font-bold text-white">
                        🏆 LATEST FINISH
                      </span>
                      <p className="mt-1.5 font-semibold text-white text-sm truncate">
                        {latestMarathon.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {latestMarathon.date?.replace(/-/g, '/')}
                        {latestMarathon.isPB && <span className="ml-2 bg-accent text-white text-[9px] px-1 py-0.5 rounded">PB</span>}
                      </p>
                    </Link>
                  </>
                )}
              </div>
            </div>
            </motion.div>

            {/* Map */}
            <motion.div variants={fadeUpItem}>
            <div className="overflow-hidden rounded-2xl glass-card shadow-card" id="map-container">
              <div className="h-[340px]">
                <RunMap
                  title=""
                  viewState={viewState}
                  geoData={animatedGeoData as any}
                  setViewState={setViewState}
                  changeYear={() => {}}
                  thisYear={year}
                />
              </div>
            </div>
            </motion.div>

            {/* Calendar */}
            <motion.div variants={fadeUpItem}>
            <CalendarWidget
              year={calendarYear}
              month={calendarMonth}
              activities={activities as Activity[]}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              view={calendarView}
              onToggleView={() => setCalendarView(v => v === 'calendar' ? 'route' : 'calendar')}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              monthKm={calendarMonthKm}
            />
            </motion.div>

            {/* Monthly Distance Chart */}
            <motion.div variants={fadeUpItem} className="mt-auto">
            <div className="rounded-2xl glass-card p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Monthly Distance</h3>
                <span className="text-xs text-zinc-500">{year}</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="km" fill="#E31937" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
