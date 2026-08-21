-- Migration: Add change-tracking columns to execution_logs
-- Supports two new execution_type values: 'Alteração de Status' and 'Alteração de Atendente'.
-- old_value/new_value hold the before/after text (status labels or attendant names).
-- changed_by_name holds the name of the user who performed the manual change
-- (null for 'Distribuição Automática', which is system-driven).

ALTER TABLE public.execution_logs
ADD COLUMN IF NOT EXISTS old_value text,
ADD COLUMN IF NOT EXISTS new_value text,
ADD COLUMN IF NOT EXISTS changed_by_name text;

COMMENT ON COLUMN public.execution_logs.old_value IS 'Previous status or previous attendant name, for Alteração de Status / Alteração de Atendente logs.';
COMMENT ON COLUMN public.execution_logs.new_value IS 'New status or new attendant name, for Alteração de Status / Alteração de Atendente logs.';
COMMENT ON COLUMN public.execution_logs.changed_by_name IS 'Name of the user who made the change. Null for automatic distribution logs.';
