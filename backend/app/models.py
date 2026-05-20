import enum
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    doctor = "doctor"
    admin = "admin"


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    patients: Mapped[list["Patient"]] = relationship(back_populates="doctor")
    consultations: Mapped[list["Consultation"]] = relationship(
        back_populates="doctor", foreign_keys="Consultation.doctor_id"
    )


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[Gender] = mapped_column(Enum(Gender), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email: Mapped[str | None] = mapped_column(String(256), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    patient_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    doctor: Mapped["User"] = relationship(back_populates="patients")
    consultations: Mapped[list["Consultation"]] = relationship(back_populates="patient")


class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    visit_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    next_visit_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    symptoms_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    clarifications_json: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    diagnoses_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    diagnosis_feedback: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="consultations")
    doctor: Mapped["User"] = relationship(
        back_populates="consultations", foreign_keys=[doctor_id]
    )
