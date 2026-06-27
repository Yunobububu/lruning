import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import racesData from '@/static/races.json';

interface Race {
  name: string; date: string; distance: number; category: string;
  chipTime: string; pace: number; isPB: boolean; city: string;
  bib: string; story: string; source: string;
  certImg?: string; medalImg?: string; photos?: string[];
  trackImg?: string; bibImg?: string;
  gearImg?: string; gearBagImg?: string; finishBagImg?: string;
  video?: string;
}

const races: Race[] = racesData.races.map(r => {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
  const prefix = (path: string | undefined) =>
    path?.startsWith('/') ? baseUrl + path.slice(1) : path;
  return {
    ...r,
    certImg: prefix(r.certImg),
    medalImg: prefix(r.medalImg),
    trackImg: prefix(r.trackImg),
    bibImg: prefix(r.bibImg),
    gearImg: prefix(r.gearImg),
    gearBagImg: prefix(r.gearBagImg),
    finishBagImg: prefix(r.finishBagImg),
    photos: r.photos?.map(p => prefix(p)) as string[] | undefined,
  };
});

const paceToStr = (s: number) => {
  const min = Math.floor(s / 60);
  return `${min}'${(s % 60).toString().padStart(2, '0')}"`;
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-zinc-500 uppercase mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-white">{value}</p>
  </div>
);

const RaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const race = id !== undefined ? races[parseInt(id)] : null;

  if (!race) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-zinc-500">赛事未找到</p>
          <Link to="/races" className="text-accent text-sm mt-4 inline-block">返回赛事列表</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:pt-12">
        {/* Back */}
        <Link to="/races" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition mb-8">
          ‹ 返回赛事列表
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-accent font-medium mb-1">
            {race.date} / {race.city}
          </p>
          {race.story && (
            <span className="inline-block bg-accent/20 text-accent text-[10px] font-bold px-2 py-0.5 rounded mb-3">
              {race.story}
            </span>
          )}
          <h1 className="text-3xl lg:text-4xl font-black text-white">{race.name}</h1>
          {race.isPB && (
            <span className="inline-block bg-accent text-white text-xs font-bold px-2 py-0.5 rounded mt-2 ml-2">PB</span>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
          <InfoItem label="Category" value={race.category} />
          <InfoItem label="Bib Number" value={`#${race.bib}`} />
          <InfoItem label="Chip Time" value={race.chipTime} />
          <InfoItem label="Pace" value={`${paceToStr(race.pace)}/km`} />
          <InfoItem label="Distance" value={`${(race.distance / 1000).toFixed(1)} km`} />
          <InfoItem label="Location" value={race.city} />
        </div>

        {/* Watch Data (if we have track img = activity data available) */}
        {race.trackImg && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Watch Data</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 rounded-2xl bg-[#111] border border-zinc-800 p-6">
              <InfoItem label="Distance" value={`${(race.distance / 1000).toFixed(2)} km`} />
              <InfoItem label="Time" value={race.chipTime} />
              <InfoItem label="Pace" value={paceToStr(race.pace)} />
              <InfoItem label="Type" value={race.category} />
            </div>
          </div>
        )}

        {/* Bib Number */}
        {race.bibImg && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Bib Number</h3>
            <img src={race.bibImg} alt={`${race.name} bib`} className="rounded-xl max-w-xs" />
          </div>
        )}

        {/* Medal & Certificate */}
        {(race.medalImg || race.certImg) && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Medal &amp; Achievements</h3>
            <div className="flex gap-4 flex-wrap">
              {race.medalImg && (
                <img src={race.medalImg} alt="Medal" className="rounded-xl max-w-[200px] object-cover" />
              )}
              {race.certImg && (
                <img src={race.certImg} alt="Certificate" className="rounded-xl max-w-[300px] object-cover" />
              )}
            </div>
          </div>
        )}

        {/* Photos Gallery */}
        {race.photos && race.photos.length > 0 && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {race.photos.map((p, i) => (
                <img key={i} src={p} alt={`Photo ${i + 1}`} className="rounded-xl w-full object-cover aspect-square" />
              ))}
            </div>
          </div>
        )}

        {/* Video */}
        {race.video && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">参赛视频</h3>
            <video src={race.video} controls className="rounded-xl max-w-lg w-full" />
          </div>
        )}

        {/* Track */}
        {race.trackImg && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">运动轨迹</h3>
            <img src={race.trackImg} alt="Track" className="rounded-xl max-w-lg" />
          </div>
        )}

        {/* Extra gear images */}
        {(race.gearImg || race.gearBagImg || race.finishBagImg) && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">参赛装备</h3>
            <div className="flex gap-4 flex-wrap">
              {race.gearImg && <img src={race.gearImg} alt="参赛服" className="rounded-xl max-w-[200px]" />}
              {race.gearBagImg && <img src={race.gearBagImg} alt="参赛包" className="rounded-xl max-w-[200px]" />}
              {race.finishBagImg && <img src={race.finishBagImg} alt="完赛包" className="rounded-xl max-w-[200px]" />}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-8 border-t border-zinc-800">
          {id && parseInt(id) > 0 ? (
            <Link to={`/races/${parseInt(id) - 1}`} className="text-sm text-zinc-500 hover:text-white transition">
              ‹ Previous
            </Link>
          ) : <div />}
          {id && parseInt(id) < races.length - 1 ? (
            <Link to={`/races/${parseInt(id) + 1}`} className="text-sm text-zinc-500 hover:text-white transition">
              Next ›
            </Link>
          ) : <div />}
        </div>
      </div>
    </Layout>
  );
};

export default RaceDetail;
