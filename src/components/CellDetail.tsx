import { fmtDateShort, fmtWeekday, timeLabel } from "../lib/date";
import "./CellDetail.css";

interface CellDetailProps {
  cellKey: string;
  people: string[];
  avails: Record<string, Set<string>>;
}

export function CellDetail({ cellKey: ck, people, avails }: CellDetailProps) {
  const [date, time] = ck.split("|");
  const yes = people.filter((n) => avails[n].has(ck));
  const no = people.filter((n) => !avails[n].has(ck));
  return (
    <div className="cell-detail">
      <span className="cell-detail-when">
        {fmtDateShort(date)}(週{fmtWeekday(date)}) {timeLabel(time)}
      </span>
      <span className="cell-detail-yes">可:{yes.join("、") || "—"}</span>
      {no.length > 0 && <span className="cell-detail-no">缺:{no.join("、")}</span>}
    </div>
  );
}
