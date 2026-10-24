import api from '../services/api';
import {
  listPendingInvoices, markSyncing, markSynced, markFailed, markPending,
  getLastSyncAt, setLastSyncAt, countByStatus,
} from '../db/invoiceRepo';

const SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;     // 2 hours
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;

let timer = null;
let started = false;
let running = false;
let drainRunning = false;
const listeners = new Set();

export function onSyncUpdate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(payload) { listeners.forEach((fn) => fn(payload)); }

/** Sync one batch. Returns { synced, failed, conflicts, done, authAborted? } */
export async function syncOnce() {
  if (running) return { skipped: true };
  running = true;

  try {
    const invoices = await listPendingInvoices(BATCH_SIZE);
    if (invoices.length === 0) {
      emit({ phase: 'idle', counts: await countByStatus() });
      return { synced: 0, failed: 0, conflicts: 0, done: true };
    }

    await markSyncing(invoices.map((i) => i.clientInvoiceId));
    emit({ phase: 'syncing', total: invoices.length });

    let synced = 0, failed = 0, conflicts = 0;

    for (const inv of invoices) {
      if ((inv.attempts || 0) >= MAX_ATTEMPTS) {
        await markFailed(inv.clientInvoiceId, 'Max attempts exceeded', { conflict: true });
        conflicts++;
        continue;
      }

      try {
        const { data } = await api.post('/sales/pos', {
          clientInvoiceId: inv.clientInvoiceId,
          deviceId: inv.deviceId,
          sequence: inv.sequence,
          createdAt: inv.createdAt,
          customerId: inv.customerId,
          paymentMethod: inv.paymentMethod,
          items: inv.items.map((i) => ({ productId: i.productId, quantity: i.qty })),
          allowNegativeStock: true,
        });
        await markSynced(inv.clientInvoiceId, data.data);
        synced++;
      } catch (err) {
        const status = err?.response?.status;

        // ✅ 401/403 = auth problem, NOT a bad invoice.
        // Revert the whole batch back to pending and abort.
        if (status === 401 || status === 403) {
          for (const pending of invoices) {
            await markPending(pending.clientInvoiceId);
          }
          emit({
            phase: 'auth_required',
            message: 'Session expired — please log in again.',
            counts: await countByStatus(),
          });
          return { synced, failed, conflicts, authAborted: true, done: true };
        }

        const conflict = status === 409 || status === 422;
        await markFailed(inv.clientInvoiceId, err, { conflict });
        if (conflict) conflicts++; else failed++;
      }
    }

    await setLastSyncAt(new Date().toISOString());
    emit({ phase: 'done', synced, failed, conflicts, counts: await countByStatus() });
    return { synced, failed, conflicts, done: invoices.length < BATCH_SIZE };
  } finally {
    running = false;
  }
}

/** Drain queue until empty or stop on error. */
export async function syncAll() {
  if (drainRunning) return { skipped: true };
  drainRunning = true;
  try {
    let result;
    let guard = 0;
    do {
      result = await syncOnce();
      guard++;
      if (result.skipped) break;
      if (result.authAborted) break;                       // stop on auth failure
      if (result.failed > 0 || result.conflicts > 0) break; // stop on human-action-needed
    } while (!result.done && guard < 100);
    return result;
  } finally {
    drainRunning = false;
  }
}

/** Start interval + online/visibility watchers (idempotent). */
export function startSyncEngine() {
  if (started) return;
  started = true;

  syncAll().catch(() => {});
  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);

  timer = setInterval(() => syncAll().catch(() => {}), SYNC_INTERVAL_MS);
}

function handleOnline() { syncAll().catch(() => {}); }
function handleVisibility() {
  if (document.visibilityState === 'visible') syncAll().catch(() => {});
}

export function stopSyncEngine() {
  if (!started) return;
  started = false;
  if (timer) { clearInterval(timer); timer = null; }
  window.removeEventListener('online', handleOnline);
  document.removeEventListener('visibilitychange', handleVisibility);
}