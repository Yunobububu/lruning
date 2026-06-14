import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import useActivities from '@/hooks/useActivities';
import { Activity, formatPace } from '@/utils/utils';

/* ── mini route SVG (color by distance) ──────── */

const COLORS = { default: '#71717a', over5: '#3b82f6', over10: '#eab308', over20: '#E31937', over40: '#a855f7' };

const MiniRoute = ({ pl, distKm }: { pl: string; distKm: number }) => {
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
    const w = 40, h = 40, pad = 3;
    const scaleX = (w - pad * 2) / (maxL - minL || 1);
    const scaleY = (h - pad * 2) / (maxA - minA || 1);
    const scale = Math.min(scaleX, scaleY);
    const ox = (w - (maxL - minL) * scale) / 2;
    const oy = (h - (maxA - minA) * scale) / 2;
    const pts = coords.map(([l, a]) => `${ox + (l - minL) * scale},${h - oy - (a - minA) * scale}`);
    return `M${pts.join(' L')}`;
  }, [pl]);

  const color = distKm >= 40 ? COLORS.over40 : distKm >= 20 ? COLORS.over20 : distKm >= 10 ? COLORS.over10 : distKm >= 5 ? COLORS.over5 : COLORS.default;
  if (!pathD) return null;
  return (
    <svg viewBox="0 0 40 40" className="block w-full h-auto">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── year card ────────────────────────────────── */

const YearCard = ({ year, runs, active, onClick }: { year: string; runs: Activity[]; active: boolean; onClick: () => void }) => {
  const dist = (runs.reduce((s, r) => s + r.distance, 0) / 1000).toFixed(2);
  const time = runs.reduce((s, r) => {
    const [h, m, sec] = r.moving_time.split(':').map(Number);
    return s + (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
  }, 0);
  const h = Math.floor(time / 3600), mn = Math.floor((time % 3600) / 60);
  const avgPace = runs.length ? formatPace(runs.reduce((s, r) => s + (r.average_speed || 0), 0) / runs.length) : '-';
  const hrs = runs.filter(r => r.average_heartrate).map(r => r.average_heartrate!);
  const avgHr = hrs.length ? Math.round(hrs.reduce((s, h) => s + h, 0) / hrs.length) : 0;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-[#111] p-4 cursor-pointer transition border ${active ? 'border-accent' : 'border-zinc-800 hover:border-zinc-600'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${active ? 'text-accent' : 'text-white'}`}>{year}</span>
        <span className="text-sm text-zinc-500">{runs.length} runs</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <div><p className="text-[11px] text-zinc-500 uppercase">DISTANCE</p><p className="text-base font-bold text-white">{dist} km</p></div>
        <div><p className="text-[11px] text-zinc-500 uppercase">TIME</p><p className="text-base font-bold text-white">{h}h {mn}m</p></div>
        <div><p className="text-[11px] text-zinc-500 uppercase">AVG PACE</p><p className="text-base font-bold text-white">{avgPace}</p></div>
        <div><p className="text-[11px] text-zinc-500 uppercase">AVG HR</p><p className="text-base font-bold text-white">{avgHr || '-'}</p></div>
      </div>
    </div>
  );
};

/* ── track wall page ──────────────────────────── */

const Tracks = () => {
  const { activities, years } = useActivities();
  const [selectedYear, setSelectedYear] = useState(years[0] || '');

  const yearRuns = useMemo(
    () => selectedYear === 'Total'
      ? (activities as Activity[])
      : (activities as Activity[]).filter((a: any) => a.start_date_local.startsWith(selectedYear)),
    [activities, selectedYear]
  );

  // Routes with polylines
  const routes = useMemo(
    () => (yearRuns as any[]).filter((a: any) => a.summary_polyline).reverse(),
    [yearRuns]
  );

  // Stats for selected year
  const stats = useMemo(() => {
    const dist = (yearRuns.reduce((s: number, r: any) => s + r.distance, 0) / 1000).toFixed(2);
    const maxDist = (Math.max(...yearRuns.map((r: any) => r.distance), 0) / 1000).toFixed(2);
    const time = yearRuns.reduce((s: number, r: any) => {
      const [h, m, sec] = (r.moving_time || '0:0:0').split(':').map(Number);
      return s + (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
    }, 0);
    const avgPace = yearRuns.length
      ? formatPace(yearRuns.reduce((s: number, r: any) => s + (r.average_speed || 0), 0) / yearRuns.length)
      : '-';
    const hrs = yearRuns.filter((r: any) => r.average_heartrate).map((r: any) => r.average_heartrate!);
    const avgHr = hrs.length ? Math.round(hrs.reduce((s: number, h: number) => s + h, 0) / hrs.length) : 0;
    return { dist, maxDist, time: `${Math.floor(time / 3600)}h ${Math.floor((time % 3600) / 60)}m`, avgPace, avgHr, runs: yearRuns.length };
  }, [yearRuns]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `/tracks/tracks-${selectedYear === 'Total' ? 'all' : selectedYear}.svg`;
    a.download = `tracks-${selectedYear === 'Total' ? 'all' : selectedYear}.svg`;
    a.click();
  };

  // Year data for left cards
  const yearData = useMemo(() => {
    return years.map((y: string) => ({
      year: y,
      runs: (activities as any[]).filter((a: any) => a.start_date_local.startsWith(y)),
    }));
  }, [activities, years]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:pt-12">
        <div className="flex gap-8">
          {/* LEFT COLUMN */}
          <div className="w-72 shrink-0 space-y-3">
            {/* Total card */}
            <div
              onClick={() => setSelectedYear('Total')}
              className={`rounded-2xl bg-[#111] p-4 cursor-pointer transition border ${selectedYear === 'Total' ? 'border-accent' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
              <YearCard year="Total" runs={activities as Activity[]} active={selectedYear === 'Total'} onClick={() => setSelectedYear('Total')} />
            </div>
            {yearData.map(({ year, runs }: any) => (
              <YearCard
                key={year}
                year={year}
                runs={runs}
                active={year === selectedYear}
                onClick={() => setSelectedYear(year)}
              />
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white italic">
                荆轲's{selectedYear !== 'Total' ? ` ${selectedYear}` : ''} Run
              </h2>
              <div className="group relative">
                <button onClick={handleDownload} className="text-zinc-700 group-hover:text-zinc-400 transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-3 mb-6">
              {routes.map((r: any, i: number) => (
                <div
                  key={i}
                  className="group relative"
                >
                  <MiniRoute pl={r.summary_polyline} distKm={r.distance / 1000} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10">
                    {r.start_date_local?.slice(0, 10)} · {(r.distance / 1000).toFixed(2)} km
                  </div>
                </div>
              ))}
            </div>

            {/* Legend + Stats */}
            <div className="flex items-start justify-between pt-4 border-t border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2">SPECIAL TRACKS</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Over 5.0 km</span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="w-3 h-3 rounded-sm bg-yellow-500" /> Over 10.0 km</span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="w-3 h-3 rounded-sm bg-accent" /> Over 20.0 km</span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="w-3 h-3 rounded-sm bg-purple-500" /> Over 40.0 km</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase mb-2">STATISTICS</p>
                <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs">
                  <div className="flex justify-between gap-2"><span className="text-zinc-500">Runs:</span><span className="text-white text-right">{stats.runs}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-zinc-500">Dist:</span><span className="text-white text-right">{stats.dist} km</span></div>
                  <div className="flex justify-between gap-2"><span className="text-zinc-500">Time:</span><span className="text-white text-right">{stats.time}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-zinc-500">Max:</span><span className="text-white text-right">{stats.maxDist} km</span></div>
                  <div className="flex justify-between gap-2"><span className="text-zinc-500">Pace:</span><span className="text-white text-right">{stats.avgPace}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-zinc-500">HR:</span><span className="text-white text-right">{stats.avgHr} bpm</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracks;
