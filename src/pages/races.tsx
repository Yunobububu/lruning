import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Layout from '@/components/Layout';
import racesData from '@/static/races.json';

interface Race {
  name: string;
  date: string;
  distance: number;
  category: string;
  chipTime: string;
  pace: number;
  isPB: boolean;
  city: string;
  bib: string;
  story: string;
  source: string;
  certImg?: string;
  medalImg?: string;
  photos?: string[];
  trackImg?: string;
  bibImg?: string;
}

const paceToStr = (s: number) => {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}'${sec.toString().padStart(2, '0')}"`;
};

const RaceCard = ({ race, index }: { race: Race; index: number }) => (
  <Link to={`/races/${index}`} className="block rounded-2xl glass-card p-6 glass-card-interactive shadow-card">
    {/* Date */}
    <p className="text-xs text-accent font-medium mb-2">{race.date}</p>
    {/* Name */}
    <h3 className="text-xl font-bold text-white mb-1">{race.name}</h3>
    {/* Story */}
    {race.story && (
      <p className="text-sm text-zinc-500 mb-4">{race.story}</p>
    )}
    {/* Details row */}
    <div className="flex items-end justify-between mt-4">
      <div className="flex gap-8">
        <div>
          <p className="text-[11px] text-zinc-600 uppercase mb-0.5">Category</p>
          <p className="text-sm font-semibold text-white">{race.category}</p>
          {race.bib && <p className="text-[11px] text-zinc-500 mt-0.5">#{race.bib}</p>}
        </div>
        <div>
          <p className="text-[11px] text-zinc-600 uppercase mb-0.5">Chip Time</p>
          <p className="text-sm font-semibold text-white">{race.chipTime}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{paceToStr(race.pace)}/km</p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-600 uppercase mb-0.5">Location</p>
          <p className="text-sm font-semibold text-white">{race.city}</p>
        </div>
      </div>
      {race.isPB && (
        <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded">PB</span>
      )}
    </div>
  </Link>
);

const Races = () => {
  const allRaces = useMemo(() => {
    return [...(racesData.races as Race[])].sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  // Year grouping
  const yearGroups = useMemo(() => {
    const groups = new Map<string, Race[]>();
    allRaces.forEach(r => {
      const y = r.date.slice(0, 4);
      groups.set(y, [...(groups.get(y) || []), r]);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allRaces]);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8 lg:pt-16">
        {/* Hero */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tight">
            奔跑
          </h1>
          <h2 className="text-3xl lg:text-5xl font-black text-accent tracking-[0.2em] uppercase mt-2">
            MARATHON LIFE
          </h2>
          <p className="mt-4 text-sm text-zinc-500 italic">
            记录每一次心跳，每一公里，每一块奖牌的故事。
          </p>
        </motion.div>

        {/* Year sections */}
        {yearGroups.map(([year, races]) => (
          <div key={year} className="mb-16">
            {/* Year header */}
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-8xl font-black text-zinc-600 select-none">{year}</span>
              <div>
                <span className="text-accent text-sm font-bold">年度汇总</span>
                <span className="text-zinc-500 text-sm ml-3">{races.length} 场赛事</span>
              </div>
            </div>
            <div className="border-t border-zinc-800 pt-6" />
            {/* Race cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {races.map((race, i) => (
                <RaceCard key={i} race={race} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Races;
