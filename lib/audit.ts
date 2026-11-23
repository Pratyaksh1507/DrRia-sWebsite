import 'server-only';
import { queryDb } from './db';

export interface AuditLogParams {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ip?: string | null;
}

/**
 * Inserts an immutable audit log entry into public.audit_logs.
 * Direct SQL insertion triggers table constraints and immutability rules.
 */
export async function logAuditEvent({
  adminId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  ip,
}: AuditLogParams): Promise<void> {
  try {
    await queryDb(
      `INSERT INTO public.audit_logs (
        admin_id,
        action,
        entity_type,
        entity_id,
        old_value,
        newValue: new_value,
        ip
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`
        .replace('newValue: new_value', 'new_value'),
      [
        adminId || null,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ip || null,
      ]
    );
  } catch (err) {
    console.error('[Audit Log Error]', err);
    throw err;
  }
}

