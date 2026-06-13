import { store } from './store';

export type AuditAction =
  | 'create'
  | 'delete'
  | 'restore'
  | 'purge'
  | 'unlock'
  | 'relock';

export interface AuditEntry {
  id: string;
  at: number; // ms timestamp
  by: string; // actor identity ("暱稱-職業")
  action: AuditAction;
  eventId: string;
  eventTitle?: string;
}

export const auditKey = (id: string) => `log:${id}`;

/** Append an audit record. Never throws — logging must not break the action. */
export async function logAction(
  by: string,
  action: AuditAction,
  ev: { id: string; title?: string },
): Promise<void> {
  const at = Date.now();
  const id = `${at.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const entry: AuditEntry = {
    id,
    at,
    by,
    action,
    eventId: ev.id,
    eventTitle: ev.title,
  };
  await store.set(auditKey(id), entry);
}

/** Load all audit entries, newest first. */
export async function loadAudit(): Promise<AuditEntry[]> {
  const keys = await store.list('log:');
  const list = (
    await Promise.all(keys.map((k) => store.get<AuditEntry>(k)))
  ).filter(Boolean) as AuditEntry[];
  return list.sort((a, b) => b.at - a.at);
}
