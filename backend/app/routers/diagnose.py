from fastapi import APIRouter, Depends

from app.deps import AnyAuthUser
from app.schemas import DiagnoseRequest, DiagnoseResponse, DiagnosisItem
from app.services.ml_service import ml_service

router = APIRouter(prefix="/diagnose", tags=["diagnose"])


@router.post("", response_model=DiagnoseResponse)
def diagnose(_: AnyAuthUser, body: DiagnoseRequest):
    ml_service.load()
    preds, needs, questions, max_p = ml_service.predict(body.symptom_keys, body.clarifications)
    items = [DiagnosisItem(**p) for p in preds]
    return DiagnoseResponse(
        predictions=items,
        needs_clarification=needs,
        clarifying_questions=questions,
        max_probability=round(max_p, 4),
    )
