from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.auth_utils import hash_password
from app.database import Base, SessionLocal, engine
from app.db_migrate import run_patient_extended_columns
from app.models import User, UserRole
from app.routers import admin, auth, consultations, diagnose, doctor, patients, symptoms

API_PREFIX = "/api"


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    run_patient_extended_columns(engine)
    db: Session = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(
                User(
                    username="doctor",
                    hashed_password=hash_password("doctor123"),
                    role=UserRole.doctor,
                    full_name="Доктор Иванов",
                )
            )
            db.add(
                User(
                    username="admin",
                    hashed_password=hash_password("admin123"),
                    role=UserRole.admin,
                    full_name="Администратор",
                )
            )
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    from app.services.ml_service import ml_service

    ml_service.load()
    yield


app = FastAPI(title="ВитаМед — медицинский центр", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix=API_PREFIX)
api.include_router(auth.router)
api.include_router(patients.router)
api.include_router(doctor.router)
api.include_router(consultations.router)
api.include_router(consultations.router_cal)
api.include_router(diagnose.router)
api.include_router(symptoms.router)
api.include_router(admin.router)
app.include_router(api)


@app.get("/health")
def health():
    return {"status": "ok"}
