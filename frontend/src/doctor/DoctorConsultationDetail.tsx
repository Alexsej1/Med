import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { Consultation, Patient } from "../types";
import { useSymptomLabels } from "../SymptomLabelsContext";
import { clarificationRows, parseDiagnosisSnapshot, symptomLabelFromSnapshot } from "./consultationDisplay";

const genderRu: Record<string, string> = {
  male: "мужской",
  female: "женский",
  other: "другой",
};

export function DoctorConsultationDetail() {
  const { consultationId } = useParams();
  const cid = Number(consultationId);
  const { token } = useAuth();
  const symptomLabels = useSymptomLabels();
  const [c, setC] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !cid) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const cons = await api.consultation(token, cid);
        if (cancelled) return;
        setC(cons);
        const p = await api.patient(token, cons.patient_id);
        if (!cancelled) setPatient(p);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, cid]);

  const diag = useMemo(() => parseDiagnosisSnapshot(c?.diagnoses_json ?? null), [c?.diagnoses_json]);

  const clarRows = useMemo(() => {
    if (!c) return [];
    const base = clarificationRows(c.clarifications_json, symptomLabels);
    return base.map((row) => ({
      ...row,
      label: symptomLabelFromSnapshot(row.key, diag, symptomLabels),
    }));
  }, [c, diag, symptomLabels]);

  if (err) return <p className="error page-loading">{err}</p>;
  if (!c || !patient) return <p className="muted page-loading">Загрузка…</p>;

  return (
    <div className="page-stack">
      <nav className="breadcrumb">
        <Link to="/doctor/history">← История консультаций</Link>
        {" · "}
        <Link to={`/doctor/patients/${patient.id}`}>{patient.name}</Link>
      </nav>
      <h1 className="page-title">Консультация · {new Date(c.visit_at).toLocaleString("ru-RU")}</h1>

      <div className="card card--elevated">
        <h2 className="card__title">Пациент</h2>
        <p className="consult-detail__patient-line">
          <strong>{patient.name}</strong>, {patient.age} лет, {genderRu[patient.gender] ?? patient.gender}
          {patient.phone && (
            <>
              {" · "}
              <span className="muted">{patient.phone}</span>
            </>
          )}
        </p>
      </div>

      <div className="card card--elevated">
        <h2 className="card__title">Визит</h2>
        <dl className="def-grid consult-detail__dl">
          <dt>Дата и время приёма</dt>
          <dd>{new Date(c.visit_at).toLocaleString("ru-RU")}</dd>
          <dt>Следующий визит</dt>
          <dd>{c.next_visit_date ?? "не запланирован"}</dd>
        </dl>
      </div>

      <div className="card card--elevated">
        <h2 className="card__title">Симптомы</h2>
        {c.symptoms_json && c.symptoms_json.length > 0 ? (
          <ul className="consult-detail__symptom-list">
            {c.symptoms_json.map((key) => (
              <li key={key}>{symptomLabelFromSnapshot(key, diag, symptomLabels)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Не указаны</p>
        )}
      </div>

      {clarRows.length > 0 && (
        <div className="card card--elevated">
          <h2 className="card__title">Уточнения</h2>
          <ul className="consult-detail__clar-list">
            {clarRows.map((row) => (
              <li key={row.key}>
                <strong>{row.label}</strong>
                <span className="muted"> — {row.present ? "да" : "нет"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diag && (
        <div className="card card--elevated">
          <h2 className="card__title">Подсказка ИИ по диагнозу</h2>
          <p className="card__meta">Максимальная уверенность: {(diag.max_probability * 100).toFixed(1)}%</p>
          <div className="diag-grid">
            {diag.predictions.map((p, i) => (
              <div key={`${p.disease}-${i}`} className="diag-card">
                <div className="diag-card__name">{p.disease}</div>
                <div className="progress" aria-hidden>
                  <span style={{ width: `${Math.min(100, p.probability * 100)}%` }} />
                </div>
                <div className="diag-card__pct">{(p.probability * 100).toFixed(1)}%</div>
                {p.symptom_influences.length > 0 && (
                  <div className="diag-card__inf">
                    <div className="diag-card__inf-title">Вклад симптомов</div>
                    <ul>
                      {p.symptom_influences.map((si) => (
                        <li key={si.symptom_key}>
                          {si.symptom_label}: <span className="muted">{si.weight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {c.notes && (
        <div className="card card--elevated">
          <h2 className="card__title">Заметки врача</h2>
          <p className="consult-detail__notes">{c.notes}</p>
        </div>
      )}

      <div className="card card--elevated">
        <h2 className="card__title">Оценка подсказки ИИ</h2>
        <p>
          {c.diagnosis_feedback === true && "Отмечено как верная"}
          {c.diagnosis_feedback === false && "Отмечено как неверная"}
          {c.diagnosis_feedback === null && <span className="muted">Не указана</span>}
        </p>
      </div>
    </div>
  );
}
