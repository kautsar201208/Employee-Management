CREATE TABLE IF NOT EXISTS public.employee_attendance_summaries (
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_year smallint NOT NULL,
    alpha_days integer NOT NULL DEFAULT 0 CHECK (alpha_days >= 0),
    late_minutes integer NOT NULL DEFAULT 0 CHECK (late_minutes >= 0),
    early_leave_minutes integer NOT NULL DEFAULT 0 CHECK (early_leave_minutes >= 0),
    forgot_clock_in_count integer NOT NULL DEFAULT 0 CHECK (forgot_clock_in_count >= 0),
    forgot_clock_out_count integer NOT NULL DEFAULT 0 CHECK (forgot_clock_out_count >= 0),
    forgotten_attendance_alpha_days numeric(10, 4)
        GENERATED ALWAYS AS (
            (forgot_clock_in_count + forgot_clock_out_count) * 120.0 / 450.0
        ) STORED,
    total_alpha_equivalent_days numeric(10, 4)
        GENERATED ALWAYS AS (
            alpha_days
            + (forgot_clock_in_count + forgot_clock_out_count) * 120.0 / 450.0
        ) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (employee_id, attendance_year),
    CHECK (attendance_year BETWEEN 2000 AND 2200)
);

ALTER TABLE public.employee_attendance_summaries ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE
ON public.employee_attendance_summaries
TO service_role;
