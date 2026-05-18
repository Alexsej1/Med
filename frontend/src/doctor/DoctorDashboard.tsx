import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { DoctorSummary } from "../types";

export function DoctorDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DoctorSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      setData(await api.doctorSummary(token));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <p className="error page-loading">{err}</p>;
  if (!data) return <p className="muted page-loading">Загрузка…</p>;

  return (
    <div className="page-stack">
      <h1 className="page-title">Обзор</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__value">{data.patients_total}</div>
          <div className="stat-card__label">Пациентов в картотеке</div>
          <Link to="/doctor/patients" className="stat-card__link">
            Открыть список →
          </Link>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{data.consultations_total}</div>
          <div className="stat-card__label">Всего консультаций</div>
          <Link to="/doctor/history" className="stat-card__link">
            Журнал →
          </Link>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{data.consultations_last_7_days}</div>
          <div className="stat-card__label">Приёмов за 7 дней</div>
          <Link to="/doctor/calendar" className="stat-card__link">
            Календарь →
          </Link>
        </div>
      </div>

      <div className="card card--elevated">
        <h2 className="card__title">Ближайшие повторные визиты</h2>
        {data.upcoming_visits.length === 0 ? (
          <p className="muted">Нет запланированных визитов в базе.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пациент</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.upcoming_visits.map((v) => (
                <tr key={v.consultation_id}>
                  <td>{v.next_visit_date}</td>
                  <td>
                    <Link to={`/doctor/patients/${v.patient_id}`}>{v.patient_name}</Link>
                  </td>
                  <td>
                    <Link to={`/doctor/consultations/${v.consultation_id}`}>Карточка визита</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="quick-actions card card--elevated">
        <h2 className="card__title">Быстрые действия</h2>
        <div className="btn-row">
          <Link to="/doctor/patients" className="btn secondary">
            Новый / список пациентов
          </Link>
          <Link to="/doctor/calendar" className="btn secondary">
            Расписание
          </Link>
        </div>
      </div>
    </div>
  );
}
