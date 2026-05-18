import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { DiagnoseResponse, Patient } from "../types";

type Clar = { symptom_key: string; present: boolean };

export function DoctorConsultation() {
  const { id } = useParams();
  const pid = Number(id);
  const { token } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [symptomInput, setSymptomInput] = useState("");
  const [suggestions, setSuggestions] = useState<{ key: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [diag, setDiag] = useState<DiagnoseResponse | null>(null);
  const [clarAnswers, setClarAnswers] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    if (!token || !pid) return;
    void api.patient(token, pid).then(setPatient).catch((e) => setErr(String(e)));
  }, [token, pid]);

  const fetchSuggest = useCallback(async () => {
    if (!token) return;
    const s = await api.symptoms(token, symptomInput);
    setSuggestions(s);
  }, [token, symptomInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchSuggest();
    }, 200);
    return () => clearTimeout(t);
  }, [fetchSuggest]);

  function addSymptom(key: string, label: string) {
    setLabels((m) => ({ ...m, [key]: label }));
    setSelected((s) => (s.includes(key) ? s : [...s, key]));
    setSymptomInput("");
    setSuggestions([]);
  }

  function removeSymptom(key: string) {
    setSelected((s) => s.filter((x) => x !== key));
    setLabels((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
  }

  async function runDiagnose() {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const clarifications: Clar[] = Object.entries(clarAnswers).map(([symptom_key, present]) => ({
        symptom_key,
        present,
      }));
      const res = await api.diagnose(token, { symptom_keys: selected, clarifications });
      setDiag(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка диагностики");
    } finally {
      setBusy(false);
    }
  }

  const clarificationsPayload = useMemo(() => {
    return Object.entries(clarAnswers).map(([symptom_key, present]) => ({ symptom_key, present }));
  }, [clarAnswers]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || feedback === null) {
      setErr("Отметьте, верен ли диагноз");
      return;
    }
    if (!diag) {
      setErr("Сначала выполните диагностику");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const c = await api.createConsultation(token, {
        patient_id: pid,
        next_visit_date: nextVisit || null,
        notes: notes || null,
        symptom_keys: selected,
        clarifications: clarificationsPayload.length ? clarificationsPayload : null,
        diagnoses: { ...diag, saved_at: new Date().toISOString() },
        diagnosis_feedback: feedback,
      });
      setSavedId(c.id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  if (!patient) return <p className="muted page-loading">Загрузка…</p>;

  return (
    <div className="page-stack">
      <nav className="breadcrumb">
        <Link to={`/doctor/patients/${pid}`}>← {patient.name}</Link>
      </nav>
      <h1 className="page-title">Консультация</h1>

      <div className="card card--elevated">
        <h2 className="card__title">Симптомы</h2>
        <div className="autocomplete field field--lg">
          <label className="field__label">Поиск симптома</label>
          <input
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            placeholder="Начните вводить, например: кашель, температура…"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="autocomplete-list" role="listbox">
              {suggestions.map((s) => (
                <li key={s.key} role="option" tabIndex={0} onClick={() => addSymptom(s.key, s.label)}>
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="chip-row">
          {selected.map((k) => (
            <span key={k} className="pill pill--removable">
              <span>{labels[k] ?? k}</span>
              <button type="button" className="pill__remove" aria-label="Удалить" onClick={() => removeSymptom(k)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="card__actions">
          <button type="button" className="btn" disabled={busy || selected.length === 0} onClick={() => void runDiagnose()}>
            Поставить диагноз
          </button>
        </div>
      </div>

      {diag && (
        <div className="card card--elevated">
          <h2 className="card__title">Результат модели</h2>
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
                    <div className="diag-card__inf-title">Вклад отмеченных симптомов</div>
                    <ul>
                      {p.symptom_influences.map((si) => (
                        <li key={si.symptom_key}>
                          {si.symptom_label}: <code>{si.weight}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {diag.needs_clarification && diag.clarifying_questions.length > 0 && (
            <div className="clar-block">
              <h3 className="clar-block__title">Уточняющие вопросы</h3>
              {diag.clarifying_questions.map((q) => (
                <div key={q.symptom_key} className="field">
                  <span className="field__label">{q.symptom_label}?</span>
                  <div className="btn-row">
                    <button
                      type="button"
                      className={clarAnswers[q.symptom_key] === true ? "btn" : "btn secondary"}
                      onClick={() => setClarAnswers((a) => ({ ...a, [q.symptom_key]: true }))}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      className={clarAnswers[q.symptom_key] === false ? "btn btn--outline-danger" : "btn secondary"}
                      onClick={() => setClarAnswers((a) => ({ ...a, [q.symptom_key]: false }))}
                    >
                      Нет
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form className="card card--elevated" onSubmit={onSave}>
        <h2 className="card__title">Заметки врача</h2>
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Например: парацетамол по схеме; ОАК, СРБ…"
        />
        <div className="field field--md">
          <label className="field__label">Дата следующего визита</label>
          <input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} />
        </div>
        <h3 className="card__subtitle">Оценка подсказки ИИ</h3>
        <div className="btn-row">
          <button
            type="button"
            className={feedback === true ? "btn" : "btn secondary"}
            onClick={() => setFeedback(true)}
          >
            Диагноз верный
          </button>
          <button
            type="button"
            className={feedback === false ? "btn btn--danger" : "btn secondary"}
            onClick={() => setFeedback(false)}
          >
            Диагноз неверный
          </button>
        </div>
        {err && <p className="error">{err}</p>}
        <div className="card__actions">
          <button className="btn btn--large" type="submit" disabled={busy || savedId !== null}>
            Сохранить консультацию
          </button>
        </div>
        {savedId !== null && (
          <p className="form-success">
            Сохранено. <Link to={`/doctor/patients/${pid}`}>Вернуться к карте пациента</Link>
          </p>
        )}
      </form>
    </div>
  );
}
