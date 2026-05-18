import json
import logging
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import DoctorUser, get_current_user
from app.models import Consultation, Patient, User, UserRole
from app.schemas import CalendarDay, ConsultationCreate, ConsultationFeedback, ConsultationOut

router = APIRouter(prefix="/consultations", tags=["consultations"])
_logger = logging.getLogger(__name__)


def _to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _append_feedback_log(c: Consultation) -> None:
    log_path = Path(__file__).resolve().parents[2] / "ml_data" / "feedback_log.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "consultation_id": c.id,
        "symptoms": c.symptoms_json,
        "diagnoses": c.diagnoses_json,
        "diagnosis_feedback": c.diagnosis_feedback,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
    except OSError:
        _logger.exception("Не удалось записать feedback_log")


def _ensure_patient_access(db: Session, user: User, patient_id: int) -> Patient:
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    if user.role == UserRole.doctor and p.doctor_id != user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к пациенту")
    return p


@router.post("", response_model=ConsultationOut)
def create_consultation(
    body: ConsultationCreate,
    user: DoctorUser,
    db: Session = Depends(get_db),
):
    _ensure_patient_access(db, user, body.patient_id)
    visit = _to_naive_utc(body.visit_at) if body.visit_at else _to_naive_utc(datetime.now(timezone.utc))
    c = Consultation(
        patient_id=body.patient_id,
        doctor_id=user.id,
        visit_at=visit,
        next_visit_date=body.next_visit_date,
        notes=body.notes,
        symptoms_json=body.symptom_keys,
        clarifications_json=body.clarifications,
        diagnoses_json=body.diagnoses,
        diagnosis_feedback=body.diagnosis_feedback,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    if c.diagnosis_feedback is not None:
        _append_feedback_log(c)
    return c


@router.get("", response_model=list[ConsultationOut])
def list_consultations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    patient_id: int | None = Query(None),
):
    q = db.query(Consultation)
    if user.role == UserRole.doctor:
        q = q.filter(Consultation.doctor_id == user.id)
    if patient_id is not None:
        q = q.filter(Consultation.patient_id == patient_id)
    return q.order_by(Consultation.visit_at.desc()).all()


@router.get("/{consultation_id}", response_model=ConsultationOut)
def get_consultation(consultation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Консультация не найдена")
    if user.role == UserRole.doctor and c.doctor_id != user.id:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return c


@router.patch("/{consultation_id}/feedback", response_model=ConsultationOut)
def feedback(
    consultation_id: int,
    body: ConsultationFeedback,
    user: DoctorUser,
    db: Session = Depends(get_db),
):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c or c.doctor_id != user.id:
        raise HTTPException(status_code=404, detail="Консультация не найдена")
    c.diagnosis_feedback = body.diagnosis_feedback
    db.commit()
    db.refresh(c)
    _append_feedback_log(c)
    return c


router_cal = APIRouter(prefix="/calendar", tags=["calendar"])


@router_cal.get("", response_model=list[CalendarDay])
def calendar(
    user: DoctorUser,
    db: Session = Depends(get_db),
    start: date | None = Query(None),
    end: date | None = Query(None),
):
    today = datetime.now(timezone.utc).date()
    start_d = start or today
    end_d = end or (today + timedelta(days=1))
    if end_d < start_d:
        raise HTTPException(status_code=400, detail="Некорректный диапазон дат")

    rows = (
        db.query(Consultation)
        .filter(Consultation.doctor_id == user.id)
        .filter(
            or_(
                Consultation.next_visit_date.between(start_d, end_d),
                func.date(Consultation.visit_at).between(start_d, end_d),
            )
        )
        .order_by(Consultation.visit_at.asc())
        .all()
    )

    by_day: dict[date, dict[int, Consultation]] = {}
    for d in range((end_d - start_d).days + 1):
        day = start_d + timedelta(days=d)
        by_day[day] = {}

    for c in rows:
        if c.next_visit_date and start_d <= c.next_visit_date <= end_d:
            by_day[c.next_visit_date][c.id] = c
        else:
            vd = c.visit_at.date() if c.visit_at.tzinfo else c.visit_at.date()
            if start_d <= vd <= end_d:
                by_day[vd][c.id] = c

    out: list[CalendarDay] = []
    for day in sorted(by_day.keys()):
        items = list(by_day[day].values())
        items.sort(key=lambda x: x.visit_at)
        out.append(CalendarDay(date=day, consultations=[ConsultationOut.model_validate(x) for x in items]))
    return out
