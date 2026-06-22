import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, Client } from '@libsql/client';

export type OrderStatus = 'CREATED' | 'PAYMENT_PENDING' | 'PAID' | 'CANCELED' | 'FAILED' | 'REFUNDED';
export type PaymentAttemptStatus = 'CREATED' | 'APPROVAL_READY' | 'APPROVED' | 'CAPTURED' | 'CANCELED' | 'FAILED' | 'REFUNDED';
export type SettlementStatus = 'PENDING' | 'SETTLED' | 'REFUNDED' | 'DISPUTED';

export type OrderInput = {
  id: string;
  idempotencyKey: string;
  orderType: string;
  itemName: string;
  region: string;
  amount: number;
  currency: string;
  note: string;
  status: OrderStatus;
  createdAt: string;
};

export type OrderRecord = OrderInput & {
  activePaymentAttemptId: string | null;
  updatedAt: string;
};

export type PaymentAttemptInput = {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId: string;
  providerCaptureId?: string | null;
  status: PaymentAttemptStatus;
  checkoutUrl: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentAttemptRecord = PaymentAttemptInput & {
  lastEventId: string | null;
};

export type ProviderEventInput = {
  id: string;
  provider: string;
  providerEventId?: string | null;
  eventType: string;
  source: string;
  orderId?: string | null;
  attemptId?: string | null;
  signatureVerified: boolean;
  payload: unknown;
  receivedAt: string;
};

export type SettlementInput = {
  id: string;
  attemptId: string;
  orderId: string;
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: SettlementStatus;
  payoutReference?: string | null;
  createdAt: string;
  updatedAt: string;
  paidOutAt?: string | null;
};

export type LedgerEntryInput = {
  id: string;
  orderId: string;
  attemptId: string;
  settlementId?: string | null;
  type: string;
  amount: number;
  currency: string;
  direction: 'debit' | 'credit';
  createdAt: string;
  metadata?: unknown;
};

export type AuditLogInput = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
};

export type IdempotencyRecord = {
  id: string;
  scope: string;
  key: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: Client;
  private schemaReady: Promise<void> | null = null;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('TURSO_DATABASE_URL');
    const authToken = this.configService.get<string>('TURSO_AUTH_TOKEN');
    if (!url || !authToken) {
      throw new Error('Turso Database URL or Auth Token is missing.');
    }
    this.client = createClient({ url, authToken });
  }

  async onModuleInit() {
    await this.ensureSchema();
  }

  getClient(): Client {
    return this.client;
  }

  async execute(sql: string, args: any[] = []) {
    await this.ensureSchema();
    return this.client.execute({ sql, args });
  }

  async findIdempotencyRecord(scope: string, key: string): Promise<IdempotencyRecord | null> {
    const result = await this.execute(
      "select id, scope, key, resource_type, resource_id, created_at from idempotency_records where scope = ? and key = ?",
      [scope, key]
    );
    const row = result.rows[0];
    return row
      ? {
          id: String(row.id),
          scope: String(row.scope),
          key: String(row.key),
          resourceType: String(row.resource_type),
          resourceId: String(row.resource_id),
          createdAt: String(row.created_at)
        }
      : null;
  }

  async insertIdempotencyRecord(input: IdempotencyRecord) {
    await this.execute(
      "insert into idempotency_records (id, scope, key, resource_type, resource_id, created_at) values (?, ?, ?, ?, ?, ?)",
      [input.id, input.scope, input.key, input.resourceType, input.resourceId, input.createdAt]
    );
  }

  async insertOrder(order: OrderInput) {
    await this.execute(
      `insert into orders
        (id, idempotency_key, order_type, item_name, region, amount, currency, note, status, active_payment_attempt_id, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.idempotencyKey,
        order.orderType,
        order.itemName,
        order.region,
        order.amount,
        order.currency,
        order.note,
        order.status,
        null,
        order.createdAt,
        order.createdAt
      ]
    );
  }

  async getOrderById(orderId: string): Promise<OrderRecord | null> {
    const result = await this.execute(
      `select id, idempotency_key, order_type, item_name, region, amount, currency, note, status,
        active_payment_attempt_id, created_at, updated_at from orders where id = ?`,
      [orderId]
    );
    const row = result.rows[0];
    return row ? this.mapOrderRow(row) : null;
  }

  async getOrderByIdempotencyKey(idempotencyKey: string): Promise<OrderRecord | null> {
    const result = await this.execute(
      `select id, idempotency_key, order_type, item_name, region, amount, currency, note, status,
        active_payment_attempt_id, created_at, updated_at from orders where idempotency_key = ?`,
      [idempotencyKey]
    );
    const row = result.rows[0];
    return row ? this.mapOrderRow(row) : null;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, activePaymentAttemptId?: string | null) {
    const now = new Date().toISOString();
    if (activePaymentAttemptId !== undefined) {
      await this.execute(
        "update orders set status = ?, active_payment_attempt_id = ?, updated_at = ? where id = ?",
        [status, activePaymentAttemptId, now, orderId]
      );
      return;
    }
    await this.execute(
      "update orders set status = ?, updated_at = ? where id = ?",
      [status, now, orderId]
    );
  }

  async insertPaymentAttempt(attempt: PaymentAttemptInput) {
    await this.execute(
      `insert into payment_attempts
        (id, order_id, provider, provider_order_id, provider_capture_id, status, checkout_url, amount, currency, created_at, updated_at, last_event_id)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attempt.id,
        attempt.orderId,
        attempt.provider,
        attempt.providerOrderId,
        attempt.providerCaptureId ?? null,
        attempt.status,
        attempt.checkoutUrl,
        attempt.amount,
        attempt.currency,
        attempt.createdAt,
        attempt.updatedAt,
        null
      ]
    );
  }

  async getPaymentAttemptById(attemptId: string): Promise<PaymentAttemptRecord | null> {
    const result = await this.execute(
      `select id, order_id, provider, provider_order_id, provider_capture_id, status, checkout_url, amount, currency,
        created_at, updated_at, last_event_id from payment_attempts where id = ?`,
      [attemptId]
    );
    const row = result.rows[0];
    return row ? this.mapPaymentAttemptRow(row) : null;
  }

  async getPaymentAttemptByProviderOrderId(providerOrderId: string): Promise<PaymentAttemptRecord | null> {
    const result = await this.execute(
      `select id, order_id, provider, provider_order_id, provider_capture_id, status, checkout_url, amount, currency,
        created_at, updated_at, last_event_id from payment_attempts where provider_order_id = ?`,
      [providerOrderId]
    );
    const row = result.rows[0];
    return row ? this.mapPaymentAttemptRow(row) : null;
  }

  async updatePaymentAttempt(
    attemptId: string,
    patch: Partial<{
      providerCaptureId: string | null;
      status: PaymentAttemptStatus;
      checkoutUrl: string;
      lastEventId: string | null;
      updatedAt: string;
    }>
  ) {
    const assignments: string[] = [];
    const args: any[] = [];

    if (patch.providerCaptureId !== undefined) {
      assignments.push("provider_capture_id = ?");
      args.push(patch.providerCaptureId);
    }
    if (patch.status !== undefined) {
      assignments.push("status = ?");
      args.push(patch.status);
    }
    if (patch.checkoutUrl !== undefined) {
      assignments.push("checkout_url = ?");
      args.push(patch.checkoutUrl);
    }
    if (patch.lastEventId !== undefined) {
      assignments.push("last_event_id = ?");
      args.push(patch.lastEventId);
    }
    assignments.push("updated_at = ?");
    args.push(patch.updatedAt ?? new Date().toISOString());

    await this.execute(
      `update payment_attempts set ${assignments.join(", ")} where id = ?`,
      [...args, attemptId]
    );

    return this.getPaymentAttemptById(attemptId);
  }

  async insertProviderEvent(event: ProviderEventInput) {
    await this.execute(
      `insert into provider_events
        (id, provider, provider_event_id, event_type, source, order_id, attempt_id, signature_verified, payload, received_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.provider,
        event.providerEventId ?? null,
        event.eventType,
        event.source,
        event.orderId ?? null,
        event.attemptId ?? null,
        event.signatureVerified ? 1 : 0,
        JSON.stringify(event.payload ?? {}),
        event.receivedAt
      ]
    );
  }

  async insertSettlementRecord(settlement: SettlementInput) {
    await this.execute(
      `insert into settlement_records
        (id, attempt_id, order_id, currency, gross_amount, fee_amount, net_amount, status, payout_reference, created_at, updated_at, paid_out_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settlement.id,
        settlement.attemptId,
        settlement.orderId,
        settlement.currency,
        settlement.grossAmount,
        settlement.feeAmount,
        settlement.netAmount,
        settlement.status,
        settlement.payoutReference ?? null,
        settlement.createdAt,
        settlement.updatedAt,
        settlement.paidOutAt ?? null
      ]
    );
  }

  async getSettlementByAttemptId(attemptId: string): Promise<SettlementRecord | null> {
    const result = await this.execute(
      `select id, attempt_id, order_id, currency, gross_amount, fee_amount, net_amount, status, payout_reference,
        created_at, updated_at, paid_out_at from settlement_records where attempt_id = ?`,
      [attemptId]
    );
    const row = result.rows[0];
    return row
      ? {
          id: String(row.id),
          attemptId: String(row.attempt_id),
          orderId: String(row.order_id),
          currency: String(row.currency),
          grossAmount: Number(row.gross_amount),
          feeAmount: Number(row.fee_amount),
          netAmount: Number(row.net_amount),
          status: String(row.status) as SettlementStatus,
          payoutReference: row.payout_reference ? String(row.payout_reference) : null,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
          paidOutAt: row.paid_out_at ? String(row.paid_out_at) : null
        }
      : null;
  }

  async insertLedgerEntry(entry: LedgerEntryInput) {
    await this.execute(
      `insert into ledger_entries
        (id, order_id, attempt_id, settlement_id, type, amount, currency, direction, created_at, metadata)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.orderId,
        entry.attemptId,
        entry.settlementId ?? null,
        entry.type,
        entry.amount,
        entry.currency,
        entry.direction,
        entry.createdAt,
        JSON.stringify(entry.metadata ?? {})
      ]
    );
  }

  async insertAuditLog(log: AuditLogInput) {
    await this.execute(
      "insert into audit_logs (id, entity_type, entity_id, action, actor, message, metadata, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
      [log.id, log.entityType, log.entityId, log.action, log.actor, log.message, JSON.stringify(log.metadata ?? {}), log.createdAt]
    );
  }

  private mapOrderRow(row: any): OrderRecord {
    return {
      id: String(row.id),
      idempotencyKey: String(row.idempotency_key),
      orderType: String(row.order_type),
      itemName: String(row.item_name),
      region: String(row.region),
      amount: Number(row.amount),
      currency: String(row.currency),
      note: String(row.note ?? ""),
      status: String(row.status) as OrderStatus,
      activePaymentAttemptId: row.active_payment_attempt_id ? String(row.active_payment_attempt_id) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private mapPaymentAttemptRow(row: any): PaymentAttemptRecord {
    return {
      id: String(row.id),
      orderId: String(row.order_id),
      provider: String(row.provider),
      providerOrderId: String(row.provider_order_id),
      providerCaptureId: row.provider_capture_id ? String(row.provider_capture_id) : null,
      status: String(row.status) as PaymentAttemptStatus,
      checkoutUrl: String(row.checkout_url),
      amount: Number(row.amount),
      currency: String(row.currency),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      lastEventId: row.last_event_id ? String(row.last_event_id) : null
    };
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        await this.client.batch(
          [
            {
              sql: `create table if not exists orders (
                id text primary key,
                idempotency_key text not null,
                order_type text not null,
                item_name text not null,
                region text not null,
                amount integer not null,
                currency text not null,
                note text not null default '',
                status text not null,
                active_payment_attempt_id text null,
                created_at text not null,
                updated_at text not null
              )`
            },
            {
              sql: `create table if not exists payment_attempts (
                id text primary key,
                order_id text not null,
                provider text not null,
                provider_order_id text not null,
                provider_capture_id text null,
                status text not null,
                checkout_url text not null,
                amount integer not null,
                currency text not null,
                created_at text not null,
                updated_at text not null,
                last_event_id text null
              )`
            },
            {
              sql: `create table if not exists provider_events (
                id text primary key,
                provider text not null,
                provider_event_id text null,
                event_type text not null,
                source text not null,
                order_id text null,
                attempt_id text null,
                signature_verified integer not null,
                payload text not null,
                received_at text not null
              )`
            },
            {
              sql: `create table if not exists settlement_records (
                id text primary key,
                attempt_id text not null,
                order_id text not null,
                currency text not null,
                gross_amount integer not null,
                fee_amount integer not null,
                net_amount integer not null,
                status text not null,
                payout_reference text null,
                created_at text not null,
                updated_at text not null,
                paid_out_at text null
              )`
            },
            {
              sql: `create table if not exists ledger_entries (
                id text primary key,
                order_id text not null,
                attempt_id text not null,
                settlement_id text null,
                type text not null,
                amount integer not null,
                currency text not null,
                direction text not null,
                created_at text not null,
                metadata text not null default '{}'
              )`
            },
            {
              sql: `create table if not exists audit_logs (
                id text primary key,
                entity_type text not null,
                entity_id text not null,
                action text not null,
                actor text not null,
                message text not null,
                metadata text not null default '{}',
                created_at text not null
              )`
            },
            {
              sql: `create table if not exists idempotency_records (
                id text primary key,
                scope text not null,
                key text not null,
                resource_type text not null,
                resource_id text not null,
                created_at text not null
              )`
            },
            { sql: "create unique index if not exists idempotency_records_scope_key_idx on idempotency_records (scope, key)" },
            { sql: "create unique index if not exists orders_idempotency_key_idx on orders (idempotency_key)" },
            { sql: "create index if not exists orders_created_at_idx on orders (created_at desc)" },
            { sql: "create index if not exists payment_attempts_order_id_idx on payment_attempts (order_id)" },
            { sql: "create index if not exists payment_attempts_provider_order_id_idx on payment_attempts (provider_order_id)" },
            { sql: "create index if not exists provider_events_attempt_id_idx on provider_events (attempt_id)" },
            { sql: "create index if not exists provider_events_received_at_idx on provider_events (received_at desc)" },
            { sql: "create index if not exists settlement_records_attempt_id_idx on settlement_records (attempt_id)" },
            { sql: "create unique index if not exists settlement_records_attempt_id_unique_idx on settlement_records (attempt_id)" },
            { sql: "create index if not exists ledger_entries_order_id_idx on ledger_entries (order_id)" }
          ],
          "write"
        );
      })();
    }
    return this.schemaReady;
  }
}
