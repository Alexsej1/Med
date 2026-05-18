import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { Consultation, Patient } from "../types";

const genderRu: Record<string, string> = {
  male: "мужской",
  female: "женский",
  other: "другой",
};

function formatRuDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function DoctorPatientDetail() {
  const { id } = useParams();
  const pid = Number(id);
  const { token } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [cons, setCons] = useState<Consultation[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirth, setEditBirth] = useState("");
  const [editGender, setEditGender] = useState("male");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPolicy, setEditPolicy] = useState("");
  const [editEmergName, setEditEmergName] = useState("");
  const [editEmergPhone, setEditEmergPhone] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editChronic, setEditChronic] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  useEffect(() => {
    if (!token || !pid) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const [p, c] = await Promise.all([api.patient(token, pid), api.consultations(token, pid)]);
        if (!cancelled) {
          setPatient(p);
          setCons(c);
          setEditName(p.name);
          setEditBirth(p.birth_date ?? "");
          setEditGender(p.gender);
          setEditPhone(p.phone ?? "");
          setEditEmail(p.email ?? "");
          setEditAddress(p.address ?? "");
          setEditPolicy(p.policy_number ?? "");
          setEditEmergName(p.emergency_contact_name ?? "");
          setEditEmergPhone(p.emergency_contact_phone ?? "");
          setEditAllergies(p.allergies ?? "");
          setEditChronic(p.chronic_conditions ?? "");
          setEditNotes(p.patient_notes ?? "");
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, pid]);

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!token || !patient) return;
    setEditBusy(true);
    setEditMsg(null);
    try {
      const updated = await api.updatePatient(token, patient.id, {
        name: editName.trim(),
        gender: editGender,
        birth_date: editBirth || null,
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        policy_number: editPolicy.trim() || null,
        emergency_contact_name: editEmergName.trim(),
        emergency_contact_phone: editEmergPhone.trim(),
        allergies: editAllergies.trim() || null,
        chronic_conditions: editChronic.trim() || null,
        patient_notes: editNotes.trim() || null,
      });
      setPatient(updated);
      setEditMsg("Сохранено");
    } catch (ex) {
      setEditMsg(ex instanceof Error ? ex.message : "Ошибка");
    } finally {
      setEditBusy(false);
    }
  }

  if (err) return <p className="error page-loading">{err}</p>;
  if (!patient) return <p className="muted page-loading">Загрузка…</p>;

  return (
    <div className="page-stack">
      <nav className="breadcrumb">
        <Link to="/doctor/patients">← К списку пациентов</Link>
      </nav>

      <header className="patient-header">
        <h1 className="page-title">{patient.name}</h1>
        <p className="patient-header__meta">
          {patient.age} лет · {genderRu[patient.gender] ?? patient.gender}
          {patient.birth_date && <> · {formatRuDate(patient.birth_date)}</>}
        </p>
      </header>

      <div className="card card--elevated">
        <Link className="btn" to={`/doctor/patients/${patient.id}/consultation`}>
          Новая консультация
        </Link>
      </div>

      <div className="card card--elevated patient-summary-card">
        <h2 className="card__title">Сводка по карте</h2>
        <dl className="def-grid">
          <dt>Телефон</dt>
          <dd>{patient.phone ?? "—"}</dd>
          <dt>Email</dt>
          <dd>{patient.email ?? "—"}</dd>
          <dt>Дата рождения</dt>
          <dd>{patient.birth_date ? formatRuDate(patient.birth_date) : "—"}</dd>
          <dt>Адрес</dt>
          <dd>{patient.address ?? "—"}</dd>
          <dt>Полис</dt>
          <dd>{patient.policy_number ?? "—"}</dd>
          <dt>Экстренный контакт</dt>
          <dd>
            {patient.emergency_contact_name || patient.emergency_contact_phone ? (
              <>
                {patient.emergency_contact_name ?? "—"}
                {patient.emergency_contact_phone && (
                  <>
                    {" "}
                    <span className="muted">· {patient.emergency_contact_phone}</span>
                  </>
                )}
              </>
            ) : (
              "—"
            )}
          </dd>
          <dt>Аллергии</dt>
          <dd className="def-grid__multiline">{patient.allergies ?? "—"}</dd>
          <dt>Хронические заболевания</dt>
          <dd className="def-grid__multiline">{patient.chronic_conditions ?? "—"}</dd>
          <dt>Заметки</dt>
          <dd className="def-grid__multiline">{patient.patient_notes ?? "—"}</dd>
          <dt>Карта создана</dt>
          <dd>{new Date(patient.created_at).toLocaleString("ru-RU")}</dd>
        </dl>
      </div>

      <div className="card card--elevated">
        <h2 className="card__title">Редактирование карты</h2>
        <form onSubmit={onSaveEdit} className="patient-create-form">
          <div className="form-grid form-grid--3">
            <div className="field field--span2">
              <label className="field__label">ФИО</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required minLength={2} />
            </div>
            <div className="field">
              <label className="field__label">Дата рождения</label>
              <input type="date" value={editBirth} onChange={(e) => setEditBirth(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Пол</label>
              <select value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                <option value="male">мужской</option>
                <option value="female">женский</option>
                <option value="other">другой</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label">Телефон</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required minLength={10} />
            </div>
            <div className="field">
              <label className="field__label">Email</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="field field--span2">
              <label className="field__label">Адрес</label>
              <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <div className="field field--span2">
              <label className="field__label">Полис</label>
              <input value={editPolicy} onChange={(e) => setEditPolicy(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Контакт (ФИО)</label>
              <input value={editEmergName} onChange={(e) => setEditEmergName(e.target.value)} required minLength={2} />
            </div>
            <div className="field">
              <label className="field__label">Контакт (телефон)</label>
              <input value={editEmergPhone} onChange={(e) => setEditEmergPhone(e.target.value)} required minLength={10} />
            </div>
            <div className="field field--span2">
              <label className="field__label">Аллергии</label>
              <textarea rows={2} value={editAllergies} onChange={(e) => setEditAllergies(e.target.value)} />
            </div>
            <div className="field field--span2">
              <label className="field__label">Хронические заболевания</label>
              <textarea rows={2} value={editChronic} onChange={(e) => setEditChronic(e.target.value)} />
            </div>
            <div className="field field--span2">
              <label className="field__label">Заметки по карте</label>
              <textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn secondary" type="submit" disabled={editBusy}>
              Сохранить изменения
            </button>
          </div>
        </form>
        {editMsg && <p className={editMsg === "Сохранено" ? "form-success" : "error"}>{editMsg}</p>}
      </div>

      <div className="card card--elevated">
        <h2 className="card__title">История консультаций</h2>
        {cons.length === 0 && <p className="muted">Записей пока нет</p>}
        <ul className="consult-list">
          {cons.map((c) => (
            <li key={c.id} className="consult-list__item">
              <div className="consult-list__head">
                <strong>{new Date(c.visit_at).toLocaleString("ru-RU")}</strong>
                <Link to={`/doctor/consultations/${c.id}`}>Подробнее</Link>
              </div>
              {c.next_visit_date && <span className="muted">След. визит: {c.next_visit_date}</span>}
              {c.diagnosis_feedback === true && <span className="pill">ИИ: верно</span>}
              {c.diagnosis_feedback === false && <span className="pill">ИИ: неверно</span>}
              {c.notes && (
                <div className="muted consult-list__notes">
                  Заметки: {c.notes}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
