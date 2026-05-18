export type UserRole = "doctor" | "admin";

export type User = {
  id: number;
  username: string;
  role: UserRole;
  full_name: string | null;
};

export type Patient = {
  id: number;
  doctor_id: number;
  name: string;
  age: number;
  gender: string;
  created_at: string;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  address?: string | null;
  policy_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  patient_notes?: string | null;
};

export type Consultation = {
  id: number;
  patient_id: number;
  doctor_id: number;
  visit_at: string;
  next_visit_date: string | null;
  notes: string | null;
  symptoms_json: string[] | null;
  clarifications_json: unknown;
  diagnoses_json: Record<string, unknown> | null;
  diagnosis_feedback: boolean | null;
  created_at: string;
};

export type DiagnosisItem = {
  disease: string;
  probability: number;
  symptom_influences: { symptom_key: string; symptom_label: string; weight: number }[];
};

export type DiagnoseResponse = {
  predictions: DiagnosisItem[];
  needs_clarification: boolean;
  clarifying_questions: { symptom_key: string; symptom_label: string; hint: string }[];
  max_probability: number;
};

export type CalendarDay = {
  date: string;
  consultations: Consultation[];
};

export type DoctorSummary = {
  patients_total: number;
  consultations_total: number;
  consultations_last_7_days: number;
  upcoming_visits: {
    consultation_id: number;
    patient_id: number;
    patient_name: string;
    next_visit_date: string;
  }[];
};
