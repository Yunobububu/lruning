import {
  formatPace,
  titleForRun,
  Activity,
  RunIds,
} from '@/utils/utils';
import { M_TO_DIST } from '@/utils/utils';
import styles from './style.module.css';

interface IRunRowProperties {
  elementIndex: number;
  locateActivity: (_runIds: RunIds) => void;
  run: Activity;
  runIndex: number;
  setRunIndex: (_ndex: number) => void;
}

const RunRow = ({
  elementIndex,
  locateActivity,
  run,
  runIndex,
  setRunIndex,
}: IRunRowProperties) => {
  const distance = (run.distance / M_TO_DIST).toFixed(2);
  const paceParts = run.average_speed ? formatPace(run.average_speed) : null;
  const heartRate = run.average_heartrate;
  const handleClick = () => {
    if (runIndex === elementIndex) {
      setRunIndex(-1);
      locateActivity([]);
      return;
    }
    setRunIndex(elementIndex);
    locateActivity([run.run_id]);
  };

  return (
    <tr
      className={`${styles.runRow} ${runIndex === elementIndex ? styles.selected : ''}`}
      key={run.start_date_local}
      onClick={handleClick}
    >
      <td className={styles.runDate}>{run.start_date_local.slice(0, 19)}</td>
      <td>{titleForRun(run)}</td>
      <td className={styles.metric}>{distance} km</td>
      <td className={styles.metric}>{run.moving_time}</td>
      <td className={styles.metric}>{paceParts || '-'}</td>
      <td className={styles.metric}>{heartRate ? heartRate.toFixed(0) : '-'}</td>
    </tr>
  );
};

export default RunRow;
