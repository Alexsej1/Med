import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { Consultation, Patient } from "../types";
import { useSymptomLabels } from "../SymptomLabelsContext";
import { notesSnippet, symptomsShort, topDiagnosisLine } from "./consultationDisplay";

function feedbackLabel(v: boolean | null): string {
  if (v === true) return "верно";
  if (v === false) return "неверно";
  return "—";
}

export function DoctorHistory() {
  const { token } = useAuth();
  const symptomLabels = useSymptomLabels();
  const [rows, setRows] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void Promise.all([api.consultations(token), api.patients(token)])
      .then(([c, p]) => {
        if (!cancelled) {
          setRows(c);
          setPatients(p);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const name = (id: number) => patients.find((p) => p.id === id)?.name ?? `#${id}`;

  if (err) return <p className="error">{err}</p>;

  return (
    <div className="page-stack">
      <h1 className="page-title">История консультаций</h1>
      <div className="card card--elevated history-card">
        <div className="history-scroll">
          <table className="table table--history">
            <thead>
              <tr>
                <th>Дата приёма</th>
                <th>Пациент</th>
                <th>Симптомы</th>
                <th>ИИ (топ)</th>
                <th>След. визит</th>
                <th>Оценка ИИ</th>
                <th>Заметки</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="nowrap">{new Date(c.visit_at).toLocaleString("ru-RU")}</td>
                  <td>
                    <Link to={`/doctor/patients/${c.patient_id}`}>{name(c.patient_id)}</Link>
                  </td>
                  <td className="history-cell--symptoms">{symptomsShort(c.symptoms_json, 5, symptomLabels)}</td>
                  <td>{topDiagnosisLine(c.diagnoses_json)}</td>
                  <td className="nowrap">{c.next_visit_date ?? "—"}</td>
                  <td>{feedbackLabel(c.diagnosis_feedback)}</td>
                  <td className="history-cell--notes">{notesSnippet(c.notes)}</td>
                  <td>
                    <Link to={`/doctor/consultations/${c.id}`}>Подробнее</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length === 0 && <p className="muted">Пока нет консультаций</p>}
    </div>
  );
}
