import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { CalendarDay, Consultation, Patient } from "../types";
import {
  addDays,
  addMonths,
  endOfMonth,
  maxDate,
  minDate,
  parseISODateLocal,
  startOfMonth,
  toISODateLocal,
} from "./dateUtils";

function dedupeById(consultations: Consultation[]): Consultation[] {
  const m = new Map<number, Consultation>();
  for (const c of consultations) m.set(c.id, c);
  return [...m.values()];
}

export function DoctorCalendar() {
  const { token } = useAuth();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODateLocal(new Date()));
  const [err, setErr] = useState<string | null>(null);

  const today = useMemo(() => toISODateLocal(new Date()), []);

  const rangeStart = useMemo(() => {
    const first = startOfMonth(monthAnchor);
    return toISODateLocal(minDate(first, new Date()));
  }, [monthAnchor]);

  const rangeEnd = useMemo(() => {
    const last = endOfMonth(monthAnchor);
    const horizon = addDays(new Date(), 75);
    return toISODateLocal(maxDate(last, horizon));
  }, [monthAnchor]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [cal, plist] = await Promise.all([
        api.calendar(token, rangeStart, rangeEnd),
        api.patients(token),
      ]);
      setCalendarDays(cal);
      setPatients(plist);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }, [token, rangeStart, rangeEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayMap = useMemo(() => new Map(calendarDays.map((d) => [d.date, d])), [calendarDays]);

  const patientName = useCallback(
    (id: number) => patients.find((p) => p.id === id)?.name ?? `Пациент #${id}`,
    [patients],
  );

  const upcoming = useMemo(() => {
    const list: Consultation[] = [];
    for (const d of calendarDays) {
      for (const c of d.consultations) {
        if (c.next_visit_date && c.next_visit_date >= today) {
          list.push(c);
        }
      }
    }
    const uniq = dedupeById(list);
    uniq.sort((a, b) => {
      const da = a.next_visit_date ?? "";
      const db = b.next_visit_date ?? "";
      if (da !== db) return da.localeCompare(db);
      return new Date(b.visit_at).getTime() - new Date(a.visit_at).getTime();
    });
    return uniq.slice(0, 24);
  }, [calendarDays, today]);

  const monthCells = useMemo(() => {
    const first = startOfMonth(monthAnchor);
    const startWeekday = (first.getDay() + 6) % 7;
    const cells: { iso: string; inMonth: boolean }[] = [];
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - startWeekday);
    for (let i = 0; i < 42; i++) {
      const iso = toISODateLocal(cursor);
      cells.push({ iso, inMonth: cursor.getMonth() === monthAnchor.getMonth() });
      cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
  }, [monthAnchor]);

  const selectedConsultations = dayMap.get(selectedDate)?.consultations ?? [];

  const monthTitle = monthAnchor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return (
    <div className="page-stack">
      <h1 className="page-title">Расписание и визиты</h1>
      {err && <p className="error">{err}</p>}

      <div className="card card--elevated">
        <h2 className="card__title">Ближайшие повторные визиты</h2>
        {upcoming.length === 0 ? (
          <p className="muted">Нет запланированных дат.</p>
        ) : (
          <ul className="upcoming-list">
            {upcoming.map((c) => (
              <li key={c.id} className="upcoming-list__item">
                <div className="upcoming-list__date">{c.next_visit_date}</div>
                <div className="upcoming-list__body">
                  <Link to={`/doctor/patients/${c.patient_id}`}>{patientName(c.patient_id)}</Link>
                  <div className="muted upcoming-list__sub">
                    <Link to={`/doctor/consultations/${c.id}`}>консультация #{c.id}</Link>
                    {" · "}
                    приём: {new Date(c.visit_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="calendar-layout">
        <div className="card card--elevated calendar-panel">
          <div className="calendar-toolbar">
            <button type="button" className="btn secondary btn--small" onClick={() => setMonthAnchor((m) => addMonths(m, -1))}>
              ←
            </button>
            <h2 className="calendar-toolbar__title">{monthTitle}</h2>
            <button type="button" className="btn secondary btn--small" onClick={() => setMonthAnchor((m) => addMonths(m, 1))}>
              →
            </button>
            <button
              type="button"
              className="btn secondary btn--small calendar-toolbar__today"
              onClick={() => {
                const n = new Date();
                setMonthAnchor(startOfMonth(n));
                setSelectedDate(toISODateLocal(n));
              }}
            >
              Сегодня
            </button>
          </div>
          <div className="month-grid-head">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="month-grid">
            {monthCells.map(({ iso, inMonth }) => {
              const day = dayMap.get(iso);
              const has = (day?.consultations.length ?? 0) > 0;
              const isSel = iso === selectedDate;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    "day-cell",
                    !inMonth ? "day-cell--muted" : "",
                    has ? "day-cell--has" : "",
                    isSel ? "day-cell--picked" : "",
                    isToday ? "day-cell--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate(iso)}
                >
                  <span className="day-cell__num">{parseISODateLocal(iso).getDate()}</span>
                  {has && <span className="day-cell__dot" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card card--elevated calendar-panel calendar-panel--detail">
          <h2 className="card__title">
            {parseISODateLocal(selectedDate).toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          {selectedConsultations.length === 0 ? (
            <p className="muted">На этот день в календаре нет приёмов и запланированных повторов.</p>
          ) : (
            <ul className="day-detail-list">
              {selectedConsultations.map((c) => (
                <li key={c.id} className="day-detail-list__item">
                  <div className="day-detail-list__row">
                    <strong>{patientName(c.patient_id)}</strong>
                    <Link to={`/doctor/consultations/${c.id}`}>Карточка</Link>
                  </div>
                  <div className="muted">
                    Визит: {new Date(c.visit_at).toLocaleString("ru-RU")}
                    {c.next_visit_date && (
                      <>
                        {" · "}
                        следующий: {c.next_visit_date}
                      </>
                    )}
                  </div>
                  {c.notes && <div className="day-detail-list__notes">{c.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
