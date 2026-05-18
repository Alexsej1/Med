"""
Удаляет все консультации и пациентов, затем заполняет БД реалистичными демо-данными.
Пользователи (врач, админ) не трогаются — логины и пароли прежние.

Запуск из каталога backend:
    python scripts/reset_and_seed.py
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.orm import Session  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Consultation, Gender, Patient, User, UserRole  # noqa: E402


def age_from_birth(bd: date) -> int:
    today = date.today()
    a = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    return max(0, min(a, 130))


def diag(
    items: list[tuple[str, float]],
    needs: bool = False,
    questions: list | None = None,
) -> dict:
    max_p = max((p for _, p in items), default=0.0)
    return {
        "predictions": [
            {
                "disease": d,
                "probability": p,
                "symptom_influences": [],
            }
            for d, p in items
        ],
        "needs_clarification": needs,
        "clarifying_questions": questions or [],
        "max_probability": max_p,
    }


def clear_and_seed() -> None:
    db: Session = SessionLocal()
    try:
        n_con = db.query(Consultation).delete(synchronize_session=False)
        n_pat = db.query(Patient).delete(synchronize_session=False)
        db.commit()
        print(f"Удалено консультаций: {n_con}, пациентов: {n_pat}")

        doctor = db.query(User).filter(User.role == UserRole.doctor).first()
        if not doctor:
            raise SystemExit(
                "Нет пользователя с ролью doctor. Запустите приложение один раз "
                "(init_db) или создайте врача вручную."
            )
        doc_id = doctor.id

        patients_spec: list[dict] = [
            {
                "name": "Ковалёва Анна Сергеевна",
                "birth": date(1986, 4, 12),
                "gender": Gender.female,
                "phone": "+375291234567",
                "email": "a.kovaleva@mail.example",
                "address": "г. Минск, ул. Ленина, д. 15, кв. 42",
                "policy": "РБ 12345678901234",
                "emerg_name": "Ковалёв Сергей Петрович",
                "emerg_phone": "+375297654321",
                "allergies": "Пенициллин",
                "chronic": "Хронический гастрит в ремиссии",
                "notes": "Предпочитает утренние приёмы.",
            },
            {
                "name": "Михайлов Дмитрий Викторович",
                "birth": date(1972, 11, 3),
                "gender": Gender.male,
                "phone": "+375447112233",
                "email": "d.mikhailov@mail.example",
                "address": "г. Гродно, пр-т Космонавтов, д. 8",
                "policy": "РБ 98765432109876",
                "emerg_name": "Михайлова Ольга",
                "emerg_phone": "+375447998877",
                "allergies": None,
                "chronic": "Артериальная гипертензия I степени",
                "notes": "Контроль АД на каждом визите.",
            },
            {
                "name": "Петрова Елена Игоревна",
                "birth": date(1995, 7, 22),
                "gender": Gender.female,
                "phone": "+375336554422",
                "email": None,
                "address": "г. Брест, ул. Советская, д. 112, кв. 5",
                "policy": "РБ 55501122334455",
                "emerg_name": "Петров Игорь",
                "emerg_phone": "+375336112233",
                "allergies": "Пыльца берёзы",
                "chronic": None,
                "notes": None,
            },
            {
                "name": "Савицкий Павел Андреевич",
                "birth": date(2001, 2, 28),
                "gender": Gender.male,
                "phone": "+375259887766",
                "email": "p.savitsky@student.example",
                "address": "г. Витебск, мкр. Южный, д. 4, кв. 18",
                "policy": None,
                "emerg_name": "Савицкая Марина",
                "emerg_phone": "+375259443322",
                "allergies": None,
                "chronic": None,
                "notes": "Студент, жалобы на утомляемость.",
            },
            {
                "name": "Лукашевич Мария Павловна",
                "birth": date(1960, 9, 5),
                "gender": Gender.female,
                "phone": "+375291778899",
                "email": "m.lukashevich@mail.example",
                "address": "г. Минск, ул. Кальварийская, д. 25, кв. 7",
                "policy": "РБ 11122233344455",
                "emerg_name": "Лукашевич Павел",
                "emerg_phone": "+375291009988",
                "allergies": "Йодсодержащие препараты",
                "chronic": "Сахарный диабет 2 типа",
                "notes": "На диете, принимает метформин (не вносить в карту — вне системы).",
            },
            {
                "name": "Жук Алексей Николаевич",
                "birth": date(1988, 1, 19),
                "gender": Gender.male,
                "phone": "+375447334455",
                "email": "a.zhuk@work.example",
                "address": "г. Могилёв, ул. Первомайская, д. 33",
                "policy": "РБ 77788899900011",
                "emerg_name": "Жук Николай",
                "emerg_phone": "+375447001122",
                "allergies": None,
                "chronic": None,
                "notes": "Работа связана с вождением.",
            },
        ]

        patients: list[Patient] = []
        for s in patients_spec:
            p = Patient(
                doctor_id=doc_id,
                name=s["name"],
                age=age_from_birth(s["birth"]),
                gender=s["gender"],
                birth_date=s["birth"],
                phone=s["phone"],
                email=s["email"],
                address=s["address"],
                policy_number=s["policy"],
                emergency_contact_name=s["emerg_name"],
                emergency_contact_phone=s["emerg_phone"],
                allergies=s["allergies"],
                chronic_conditions=s["chronic"],
                patient_notes=s["notes"],
            )
            db.add(p)
            patients.append(p)
        db.flush()

        def pid(i: int) -> int:
            return patients[i].id

        now = datetime.utcnow().replace(microsecond=0)
        visits: list[tuple[int, datetime, date | None, list[str], dict | None, str | None, bool | None]] = [
            # (patient_index, visit_at, next_visit_date, symptoms, diagnoses, notes, feedback)
            (
                0,
                now - timedelta(days=45, hours=2),
                None,
                ["fever", "cough", "runny_nose", "headache", "weakness"],
                diag([("ОРВИ", 0.58), ("Острый риносинусит", 0.18)]),
                "Рекомендованы обильное питьё и постельный режим 2–3 дня.",
                True,
            ),
            (
                0,
                now - timedelta(days=12, hours=5),
                date.today() + timedelta(days=14),
                ["sore_throat", "hoarseness", "dry_cough"],
                diag([("Острый фарингит", 0.45), ("ОРВИ", 0.25)]),
                "Полоскания, щадящий режим голоса.",
                True,
            ),
            (
                1,
                now - timedelta(days=60, hours=1),
                None,
                ["headache", "weakness", "chest_pain"],
                diag([("Артериальная гипертензия (обострение)", 0.35), ("Тревожное расстройство", 0.12)]),
                "Контроль АД, дневник давления.",
                None,
            ),
            (
                1,
                now - timedelta(days=5, hours=3),
                date.today() + timedelta(days=30),
                ["shortness_breath", "wheezing", "cough"],
                diag([("Бронхиальная астма, обострение лёгкой степени", 0.41), ("ОРВИ", 0.2)]),
                "Ингаляционная терапия по схеме, контроль через месяц.",
                True,
            ),
            (
                2,
                now - timedelta(days=20, hours=4),
                None,
                ["runny_nose", "sore_throat", "sinus_pressure", "itching"],
                diag([("Аллергический ринит", 0.52), ("ОРВИ", 0.22)]),
                "Антигистаминные по необходимости, исключить контакт с аллергеном.",
                True,
            ),
            (
                2,
                now - timedelta(days=2, hours=6),
                None,
                ["nausea", "diarrhea", "weakness"],
                diag([("Острая кишечная инфекция", 0.38), ("Пищевая токсикоинфекция", 0.24)]),
                "Регидратация, диета.",
                None,
            ),
            (
                3,
                now - timedelta(days=90, hours=2),
                None,
                ["headache", "myalgia", "chills", "fever"],
                diag([("ОРВИ", 0.55), ("Гриппоподобное состояние", 0.28)]),
                "Симптоматическое лечение.",
                True,
            ),
            (
                3,
                now - timedelta(days=1, hours=1),
                date.today() + timedelta(days=7),
                ["weakness", "headache"],
                diag([("Астенический синдром", 0.22), ("Анемия (не исключена)", 0.15)]),
                "Общий анализ крови, консультация при сохранении жалоб.",
                None,
            ),
            (
                4,
                now - timedelta(days=30, hours=3),
                None,
                ["weakness", "nausea", "headache"],
                diag([("Декомпенсация сахарного диабета (подозрение)", 0.33), ("ОРВИ", 0.15)]),
                "Гликемия в день визита в норме, повторить анализ натощак.",
                True,
            ),
            (
                4,
                now - timedelta(hours=8),
                date.today() + timedelta(days=21),
                ["chest_pain", "shortness_breath", "weakness"],
                diag([("Ишемическая болезнь сердца (исключить)", 0.19), ("Межрёберная невралгия", 0.16)]),
                "ЭКГ без патологии, рекомендовано наблюдение кардиолога при повторении боли.",
                None,
            ),
            (
                5,
                now - timedelta(days=14, hours=2),
                None,
                ["dry_cough", "chest_pain", "weakness"],
                diag([("Трахеит", 0.31), ("ОРВИ", 0.27)]),
                "Муколитики, избегать переохлаждения.",
                True,
            ),
            (
                5,
                now - timedelta(days=0, hours=4),
                None,
                ["sore_throat", "fever", "headache"],
                diag([("Острый тонзиллит", 0.36), ("ОРВИ", 0.34)]),
                "Смягчающие, при температуре выше 38.5 — жаропонижающие.",
                None,
            ),
        ]

        for p_idx, visit_at, next_d, sym_keys, diagnoses, notes, feedback in visits:
            c = Consultation(
                patient_id=pid(p_idx),
                doctor_id=doc_id,
                visit_at=visit_at,
                next_visit_date=next_d,
                notes=notes,
                symptoms_json=sym_keys,
                clarifications_json=None,
                diagnoses_json=diagnoses,
                diagnosis_feedback=feedback,
                created_at=visit_at,
            )
            db.add(c)

        db.commit()
        print(
            f"Добавлено пациентов: {len(patients)}, консультаций: {len(visits)} "
            f"(врач id={doc_id}, {doctor.username})."
        )
    finally:
        db.close()


if __name__ == "__main__":
    clear_and_seed()
