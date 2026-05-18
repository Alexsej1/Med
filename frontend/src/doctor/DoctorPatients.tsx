import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { Patient } from "../types";

const genderRu: Record<string, string> = {
  male: "мужской",
  female: "женский",
  other: "другой",
};

const emptyCreate = {
  name: "",
  birth_date: "",
  gender: "male",
  phone: "",
  email: "",
  address: "",
  policy_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  allergies: "",
  chronic_conditions: "",
  patient_notes: "",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

export function DoctorPatients() {
  const { token } = useAuth();
  const [list, setList] = useState<Patient[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCreate);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = "patient-create-modal-title";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadErr(null);
    try {
      setList(await api.patients(token, debouncedSearch ? { q: debouncedSearch } : undefined));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Ошибка");
    }
  }, [token, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModalOpen(false);
        setCreateErr(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreateErr(null);
    try {
      await api.createPatient(token, {
        name: form.name.trim(),
        birth_date: form.birth_date,
        gender: form.gender,
        phone: form.phone.trim(),
        emergency_contact_name: form.emergency_contact_name.trim(),
        emergency_contact_phone: form.emergency_contact_phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        policy_number: form.policy_number.trim() || null,
        allergies: form.allergies.trim() || null,
        chronic_conditions: form.chronic_conditions.trim() || null,
        patient_notes: form.patient_notes.trim() || null,
      });
      setForm(emptyCreate);
      setModalOpen(false);
      await load();
    } catch (ex) {
      setCreateErr(ex instanceof Error ? ex.message : "Ошибка");
    }
  }

  function closeModal() {
    setModalOpen(false);
    setCreateErr(null);
  }

  return (
    <>
      <div className="page-stack patients-page">
        <header className="patients-page__header">
          <div>
            <h1 className="page-title patients-page__title">Пациенты</h1>
            <p className="patients-page__count">{list.length} в списке</p>
          </div>
          <button type="button" className="btn patients-page__new" onClick={() => setModalOpen(true)}>
            Новая карта
          </button>
        </header>

        <div className="card card--elevated patients-toolbar">
          <div className="patients-toolbar__inner">
            <div className="field field--lg patients-toolbar__search">
              <label className="field__label" htmlFor="patient-search">
                Поиск
              </label>
              <input
                id="patient-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Фамилия или имя…"
                autoComplete="off"
              />
            </div>
          </div>
          {loadErr && <p className="error patients-toolbar__err">{loadErr}</p>}
        </div>

        <div className="card card--elevated patient-list-card">
          {list.length === 0 ? (
            <div className="patient-list-empty">
              <p className="patient-list-empty__title">{debouncedSearch ? "Ничего не найдено" : "Пациентов пока нет"}</p>
              {!debouncedSearch && (
                <button type="button" className="btn secondary" onClick={() => setModalOpen(true)}>
                  Новая карта
                </button>
              )}
            </div>
          ) : (
            <ul className="patient-list" aria-label="Список пациентов">
              {list.map((p) => (
                <li key={p.id} className="patient-list__item">
                  <div className="patient-list__avatar" aria-hidden>
                    {initials(p.name)}
                  </div>
                  <div className="patient-list__body">
                    <div className="patient-list__name">{p.name}</div>
                    <div className="patient-list__phone muted">{p.phone ?? "телефон не указан"}</div>
                  </div>
                  <div className="patient-list__tags">
                    <span className="patient-tag">{p.age} лет</span>
                    <span className="patient-tag patient-tag--muted">{genderRu[p.gender] ?? p.gender}</span>
                  </div>
                  <Link className="btn btn--small secondary patient-list__link" to={`/doctor/patients/${p.id}`}>
                    Карта
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal" role="presentation">
          <button type="button" className="modal__backdrop" aria-label="Закрыть" onClick={closeModal} />
          <div
            ref={panelRef}
            className="modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2 id={titleId} className="modal__title">
                Новая амбулаторная карта
              </h2>
              <button type="button" className="modal__close" aria-label="Закрыть" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={onCreate} className="patient-create-form modal__form">
              <fieldset className="form-section">
                <legend>Личные данные</legend>
                <div className="form-grid form-grid--3">
                  <div className="field field--span2">
                    <label className="field__label">ФИО полностью *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      minLength={2}
                      maxLength={128}
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Дата рождения *</label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Пол *</label>
                    <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                      <option value="male">мужской</option>
                      <option value="female">женский</option>
                      <option value="other">другой</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend>Контакты и документы</legend>
                <div className="form-grid form-grid--2">
                  <div className="field">
                    <label className="field__label">Телефон пациента *</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      required
                      minLength={10}
                      maxLength={64}
                      placeholder="+375 …"
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Электронная почта</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      maxLength={256}
                      placeholder="необязательно"
                    />
                  </div>
                  <div className="field field--span2">
                    <label className="field__label">Адрес регистрации / проживания</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      maxLength={1024}
                      placeholder="город, улица, дом, кв."
                    />
                  </div>
                  <div className="field field--span2">
                    <label className="field__label">Номер полиса ОМС / ДМС</label>
                    <input
                      value={form.policy_number}
                      onChange={(e) => setForm((f) => ({ ...f, policy_number: e.target.value }))}
                      maxLength={128}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend>Контакт для экстренной связи</legend>
                <div className="form-grid form-grid--2">
                  <div className="field">
                    <label className="field__label">ФИО контактного лица *</label>
                    <input
                      value={form.emergency_contact_name}
                      onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                      required
                      minLength={2}
                      maxLength={256}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Телефон контактного лица *</label>
                    <input
                      value={form.emergency_contact_phone}
                      onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                      required
                      minLength={10}
                      maxLength={64}
                      placeholder="+375 …"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend>Медицинская информация</legend>
                <div className="field">
                  <label className="field__label">Аллергии</label>
                  <textarea
                    rows={2}
                    value={form.allergies}
                    onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                    maxLength={4000}
                    placeholder="Лекарственные, пищевые и др., или «нет известных»"
                  />
                </div>
                <div className="field">
                  <label className="field__label">Хронические заболевания</label>
                  <textarea
                    rows={2}
                    value={form.chronic_conditions}
                    onChange={(e) => setForm((f) => ({ ...f, chronic_conditions: e.target.value }))}
                    maxLength={4000}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Заметки по карте</label>
                  <textarea
                    rows={2}
                    value={form.patient_notes}
                    onChange={(e) => setForm((f) => ({ ...f, patient_notes: e.target.value }))}
                    maxLength={4000}
                    placeholder="Важное для приёма: сопутствующие факторы, ограничения и т.д."
                  />
                </div>
              </fieldset>

              {createErr && <p className="error modal__err">{createErr}</p>}

              <div className="modal__actions">
                <button type="button" className="btn secondary" onClick={closeModal}>
                  Отмена
                </button>
                <button className="btn" type="submit">
                  Создать карту
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
