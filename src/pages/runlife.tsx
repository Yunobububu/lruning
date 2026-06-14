import { useMemo, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import useActivities from '@/hooks/useActivities';
import { Activity } from '@/utils/utils';

const START_YEAR = 1991;
const START_MONTH = 5;
const TOTAL_MONTHS = 1008;
const COLS = 24;
const ROWS = Math.ceil(TOTAL_MONTHS / COLS);

const getColor = (km: number) => {
  if (km >= 300) return 'bg-purple-500';
  if (km >= 200) return 'bg-accent';
  if (km >= 100) return 'bg-yellow-500';
  if (km > 0)    return 'bg-blue-500';
  return '';
};

const RunLife = () => {
  const { activities } = useActivities();
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const monthMap = useMemo(() => {
    const m = new Map<string, number>();
    (activities as Activity[]).forEach((a: any) => {
      const key = a.start_date_local.slice(0, 7);
      m.set(key, (m.get(key) || 0) + a.distance / 1000);
    });
    return m;
  }, [activities]);

  const months = useMemo(() => {
    const result: { key: string; km: number }[] = [];
    for (let i = 0; i < TOTAL_MONTHS; i++) {
      const totalMonths = START_YEAR * 12 + (START_MONTH - 1) + i;
      const y = Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      result.push({ key, km: monthMap.get(key) || 0 });
    }
    return result;
  }, [monthMap]);

  const grid = useMemo(() => {
    const cells: (typeof months[0] | null)[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: (typeof months[0] | null)[] = [];
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        row.push(idx < TOTAL_MONTHS ? months[idx] : null);
      }
      cells.push(row);
    }
    return cells;
  }, [months]);

  const activeMonths = useMemo(() => months.filter(m => m.km > 0).length, [months]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRevealed(prev => {
        if (prev >= TOTAL_MONTHS) {
          clearInterval(interval);
          setTimeout(() => setShowOverlay(true), 400);
          return prev;
        }
        return prev + 24;
      });
    }, 15);
    return () => clearInterval(interval);
  }, []);

  const OverlayContent = () => (
    <div className="text-center">
      <h1 className="text-2xl font-black italic tracking-tight">
        RUNNING<span className="text-accent">.LIFE</span>
      </h1>
      <p className="mt-1.5 text-sm text-zinc-400">
        {activeMonths} / {TOTAL_MONTHS} months · {((activeMonths / TOTAL_MONTHS) * 100).toFixed(1)}%
      </p>
    </div>
  );

  const downloadSVG = () => {
    const a = document.createElement('a');
    a.href = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/running-life.svg`;
    a.download = 'running-life.svg';
    a.click();
  };

  return (
    <Layout>
      <div className="mx-auto px-4 pt-4 pb-12 flex flex-col items-center">
        {/* Title + stats ABOVE grid (expanded) */}
        {expanded && showOverlay && (
          <div className="mb-6 flex items-center gap-2 group text-center flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black italic tracking-tight">
                RUNNING<span className="text-accent">.LIFE</span>
              </h1>
              <button
                onClick={() => setExpanded(false)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white"
                title="Collapse"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="16" height="16" rx="2" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {activeMonths} / {TOTAL_MONTHS} months · {((activeMonths / TOTAL_MONTHS) * 100).toFixed(1)}%
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="relative inline-flex flex-col gap-[8px] bg-[#0a0a0a] p-4 rounded-2xl border border-zinc-800 group">
          {/* Edge buttons (hover to show) */}
          <div className="absolute top-3 right-3 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setExpanded(!expanded)} className="text-zinc-500 hover:text-white" title={expanded ? 'Collapse' : 'Expand'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="16" height="16" rx="2" />
              </svg>
            </button>
            <button onClick={downloadSVG} className="text-zinc-500 hover:text-white" title="Download">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
          {/* Overlay (collapsed) */}
          {!expanded && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 transition-opacity duration-700 group mb-[90%] ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
              <OverlayContent />
            </div>
          )}

          {/* Cells */}
          {grid.map((row, r) => (
            <div key={r} className="flex gap-[8px]">
              {row.map((cell, c) => {
                const idx = r * COLS + c;
                const visible = idx < revealed;
                if (cell === null) return <div key={c} className="w-[6.5px] h-[6.5px]" />;
                return (
                  <div
                    key={c}
                    className={`w-[6.5px] h-[6.5px] flex-shrink-0 transition-opacity duration-150 ${
                      visible ? 'opacity-100' : 'opacity-0'
                    } ${getColor(cell.km)} ${cell.km === 0 ? 'bg-zinc-800' : ''}`}
                    title={visible ? `${cell.key} · ${cell.km.toFixed(1)} km` : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend BELOW grid (expanded) */}
        {expanded && showOverlay && (
          <div className="flex justify-center gap-6 mt-6 animate-[slideUp_0.7s_ease-out]">
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-blue-500" /> under 100 km</span>
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-yellow-500" /> 100–200 km</span>
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-accent" /> 200–300 km</span>
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-purple-500" /> over 300 km</span>
          </div>
        )}

        {/* Legend overlay (collapsed) */}
        {!expanded && showOverlay && (
          <div className="absolute bottom-[320px] left-0 right-0 flex justify-center gap-6 z-20 animate-[slideUp_0.7s_ease-out]">
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-blue-500" /> under 100 km</span>
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-yellow-500" /> 100–200 km</span>
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-accent" /> 200–300 km</span>
            <span className="flex items-center gap-1 text-[9px] text-zinc-400"><span className="w-2 h-2 bg-purple-500" /> over 300 km</span>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RunLife;
