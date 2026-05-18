from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import AdminUser
from app.models import Consultation, Patient, User, UserRole
from app.schemas import ConsultationOut

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


class ConsultationAdminCreateIn(BaseModel):
    patient_id: int
    doctor_id: int
    visit_at: datetime | None = None
    next_visit_date: date | None = None
    notes: str | None = None
    symptom_keys: list[str] = []
    clarifications: list[dict] | None = None
    diagnoses: dict = Field(default_factory=dict)
    diagnosis_feedback: bool | None = None


@router.get("/doctors", response_model=list[dict])
def list_doctors(_: AdminUser, db: Session = Depends(get_db)):
    docs = db.query(User).filter(User.role == UserRole.doctor).all()
    return [{"id": u.id, "username": u.username, "full_name": u.full_name} for u in docs]


@router.post("/consultations", response_model=ConsultationOut)
def admin_create_consultation(
    body: ConsultationAdminCreateIn,
    _: AdminUser,
    db: Session = Depends(get_db),
):
    doc = db.query(User).filter(User.id == body.doctor_id, User.role == UserRole.doctor).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Врач не найден")
    p = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    visit = _to_naive_utc(body.visit_at) if body.visit_at else _to_naive_utc(datetime.now(timezone.utc))
    c = Consultation(
        patient_id=body.patient_id,
        doctor_id=body.doctor_id,
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
    return c


@router.delete("/consultations/{consultation_id}")
def admin_delete_consultation(consultation_id: int, _: AdminUser, db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Не найдено")
    db.delete(c)
    db.commit()
    return {"ok": True}
