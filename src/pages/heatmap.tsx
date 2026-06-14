import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import useActivities from '@/hooks/useActivities';
import racesData from '@/static/races.json';
import { Activity } from '@/utils/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const getColor = (km: number) => {
  if (km >= 42) return 'bg-purple-500';
  if (km >= 20) return 'bg-accent';
  if (km >= 10) return 'bg-yellow-500';
  if (km > 0)  return 'bg-blue-500';
  return '';
};

const PER_PAGE = 4;

const YearHeatmap = ({ year, activities, raceDateMap }: { year: string; activities: Activity[]; raceDateMap: Map<string, number> }) => {
  const grid = useMemo(() => {
    // Build date->km map
    const dm = new Map<string, number>();
    activities
      .filter((a: any) => a.start_date_local.startsWith(year))
      .forEach((a: any) => {
        const d = a.start_date_local.slice(0, 10);
        dm.set(d, (dm.get(d) || 0) + a.distance / 1000);
      });

    // Build weeks for each month
    const months: { name: string; weeks: { day: number | null; date: string; km: number; isMarathon: boolean }[][] }[] = [];
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const dim = new Date(+year, m, 0).getDate();
      const firstDay = new Date(+year, m - 1, 1).getDay();
      const weeks: any[][] = [];
      let week: any[] = [];
      for (let i = 0; i < firstDay; i++) week.push(null);
      for (let d = 1; d <= dim; d++) {
        const ds = String(d).padStart(2, '0');
        const date = `${year}-${mm}-${ds}`;
        const km = dm.get(date) || 0;
        const raceIdx = raceDateMap.get(date);
        week.push({ day: d, date, km, raceIdx: raceIdx !== undefined ? raceIdx : -1 });
        if (week.length === 7 || d === dim) {
          while (week.length < 7) week.push(null);
          weeks.push(week);
          week = [];
        }
      }
      months.push({ name: MONTHS[m - 1], weeks });
    }
    return months;
  }, [activities, year, raceDateMap]);

  return (
    <div className="shrink-0 rounded-2xl border border-zinc-800 bg-[#111] p-4 group">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">{year}</h3>
        <button
          onClick={() => {
            const a = document.createElement('a');
            a.href = `/heatmaps/heatmap-${year}.svg`;
            a.download = `heatmap-${year}.svg`;
            a.click();
          }}
          className="text-zinc-700 group-hover:text-zinc-400 transition"
          title="Download heatmap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
      {/* Day headers */}
      <div className="flex gap-px ml-4 mb-0.5">
        {DAYS.map(d => (
          <div className="w-[16px] text-center text-[10px] text-zinc-500 leading-none">{d}</div>
          ))}
          </div>
          {/* Month blocks */}
          {grid.map((month, mi) => (
          <div key={month.name} className="flex gap-0.5 mb-0.5 items-start">
          <span className="w-3 text-right text-[9px] text-zinc-600 pr-1 leading-none mt-0.5">{month.name}</span>
          <div className="flex flex-col gap-0.5">
            {month.weeks.map((week, wi) => (
              <div key={wi} className="flex gap-0.5">
                {week.map((cell, ci) =>
                  cell === null ? (
                    <div key={ci} className="w-[18px] h-[18px]" />
                  ) : (
                    <Link
                      key={ci}
                      to={cell.raceIdx >= 0 ? `/races/${cell.raceIdx}` : '#'}
                      className={`w-[18px] h-[18px] rounded-sm ${getColor(cell.km)} ${cell.km === 0 ? 'bg-zinc-800' : 'hover:ring-1 hover:ring-white/30'} flex items-center justify-center transition`}
                      title={cell.km > 0 ? `${cell.date} · ${cell.km.toFixed(1)} km` : cell.date}
                      onClick={e => cell.raceIdx < 0 && cell.km === 0 && e.preventDefault()}
                    >
                      {cell.raceIdx >= 0 && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow">
                          <circle cx="12" cy="8" r="7" />
                          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                        </svg>
                      )}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Heatmap = () => {
  const { activities, years } = useActivities();

  const raceDateMap = useMemo(() => {
    const m = new Map<string, number>();
    (racesData.races as any[]).forEach((r: any, i: number) => {
      m.set(r.date, i);
    });
    return m;
  }, []);

  const sortedYears = useMemo(() => [...years].sort((a, b) => +b - +a), [years]);
  const totalPages = Math.ceil(sortedYears.length / PER_PAGE);
  const [currentPage, setCurrentPage] = useState(0);

  const visibleYears = useMemo(
    () => sortedYears.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE),
    [sortedYears, currentPage]
  );

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:pt-12">
        <div className="flex items-start justify-center gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0 mt-[216px]"
          >
            ‹
          </button>

          <div className="flex justify-center gap-6">
            {visibleYears.map(year => (
              <YearHeatmap key={year} year={year} activities={activities as Activity[]} raceDateMap={raceDateMap} />
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0 mt-[216px]"
          >
            ›
          </button>
        </div>

        <div className="text-center mt-4">
          <span className="text-sm text-zinc-500">Page {currentPage + 1} of {totalPages}</span>
        </div>
      </div>
    </Layout>
  );
};

export default Heatmap;
