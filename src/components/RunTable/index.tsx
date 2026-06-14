import React, { useState, useMemo, useCallback } from 'react';
import {
  sortDateFunc,
  sortDateFuncReverse,
  convertMovingTime2Sec,
  Activity,
  RunIds,
} from '@/utils/utils';

import RunRow from './RunRow';
import styles from './style.module.css';

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

type SortFunc = (_a: Activity, _b: Activity) => number;

const COLUMNS = ['DATE', 'NAME', 'DISTANCE', 'DURATION', 'PACE', 'HR'];

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IRunTableProperties) => {
  const [sortFuncInfo, setSortFuncInfo] = useState('');

  const sortFunctions = useMemo(() => {
    const sortDistFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'DISTANCE'
        ? a.distance - b.distance
        : b.distance - a.distance;
    const sortPaceFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'PACE'
        ? a.average_speed - b.average_speed
        : b.average_speed - a.average_speed;
    const sortHRFunc: SortFunc = (a, b) => {
      return sortFuncInfo === 'HR'
        ? (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0)
        : (b.average_heartrate ?? 0) - (a.average_heartrate ?? 0);
    };
    const sortDurationFunc: SortFunc = (a, b) => {
      const aTotalSeconds = convertMovingTime2Sec(a.moving_time);
      const bTotalSeconds = convertMovingTime2Sec(b.moving_time);
      return sortFuncInfo === 'DURATION'
        ? aTotalSeconds - bTotalSeconds
        : bTotalSeconds - aTotalSeconds;
    };
    const sortDateFuncClick =
      sortFuncInfo === 'DATE' ? sortDateFunc : sortDateFuncReverse;

    const sortFuncMap = new Map<string, SortFunc>([
      ['DATE', sortDateFuncClick],
      ['DISTANCE', sortDistFunc],
      ['DURATION', sortDurationFunc],
      ['PACE', sortPaceFunc],
      ['HR', sortHRFunc],
    ]);

    return sortFuncMap;
  }, [sortFuncInfo]);

  const handleClick = useCallback<React.MouseEventHandler<HTMLElement>>(
    (e) => {
      const funcName = (e.target as HTMLElement).innerHTML;
      const f = sortFunctions.get(funcName);

      setRunIndex(-1);
      setSortFuncInfo(sortFuncInfo === funcName ? '' : funcName);
      if (f) {
        setActivity([...runs].sort(f));
      }
    },
    [sortFunctions, sortFuncInfo, runs, setRunIndex, setActivity]
  );

  return (
    <div className={styles.tableContainer}>
      <table className={styles.runTable} cellSpacing="0" cellPadding="0">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col} onClick={handleClick}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, elementIndex) => (
            <RunRow
              key={run.run_id}
              elementIndex={elementIndex}
              locateActivity={locateActivity}
              run={run}
              runIndex={runIndex}
              setRunIndex={setRunIndex}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RunTable;
