import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService, OrderStatus, PaymentAttemptStatus } from '../database/database.service.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PaymentsService {
  private readonly portoneSecret: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.portoneSecret = this.configService.get<string>('PORTONE_API_SECRET') || '';
    if (!this.portoneSecret) {
      console.warn('Warning: PORTONE_API_SECRET is not configured.');
    }
  }

  private makeId(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  async verifyAndCompletePayment(dto: VerifyPaymentDto): Promise<any> {
    const { paymentId, orderId } = dto;

    // 1. Get database order
    const order = await this.db.getOrderById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.status === 'PAID') {
      // Replay check
      const attempt = await this.db.getPaymentAttemptById(order.activePaymentAttemptId || '');
      const settlement = attempt ? await this.db.getSettlementByAttemptId(attempt.id) : null;
      return {
        ok: true,
        replayed: true,
        receipt: {
          amount: order.amount,
          method: attempt?.provider || '카드 결제',
          txId: attempt?.providerCaptureId || '-',
          status: 'PAID',
        },
      };
    }

    // Find the payment attempt record
    const attempt = await this.db.getPaymentAttemptByProviderOrderId(paymentId);
    if (!attempt) {
      throw new NotFoundException(`Payment attempt for paymentId ${paymentId} not found.`);
    }

    // 2. Fetch transaction from PortOne V2 REST API
    const portoneUrl = `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`;
    let responseData: any;
    try {
      const response = await fetch(portoneUrl, {
        headers: {
          'Authorization': `PortOne ${this.portoneSecret}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`PortOne V2 returned status ${response.status}: ${errText}`);
      }

      responseData = await response.json();
    } catch (error) {
      console.error('Failed to fetch transaction from PortOne:', error);
      throw new BadRequestException(`PortOne API verification failed: ${error.message}`);
    }

    // 3. Verify payment status and amount
    const portoneStatus = responseData.status; // e.g. "PAID"
    const portoneAmount = responseData.amount?.total; // total amount in KRW

    if (portoneStatus !== 'PAID') {
      await this.db.insertAuditLog({
        id: this.makeId('audit'),
        entityType: 'payment_attempt',
        entityId: attempt.id,
        action: 'VERIFY_FAILED',
        actor: 'system',
        message: `PortOne paymentId ${paymentId} status is ${portoneStatus} (expected PAID)`,
        createdAt: this.nowIso(),
      });
      throw new BadRequestException(`Payment is not completed. Status: ${portoneStatus}`);
    }

    if (portoneAmount !== order.amount) {
      await this.db.insertAuditLog({
        id: this.makeId('audit'),
        entityType: 'payment_attempt',
        entityId: attempt.id,
        action: 'VERIFY_FAILED',
        actor: 'system',
        message: `PortOne paymentId ${paymentId} amount ${portoneAmount} mismatched with order amount ${order.amount}`,
        createdAt: this.nowIso(),
      });
      throw new BadRequestException(`Payment amount mismatch. Expected: ${order.amount}, Paid: ${portoneAmount}`);
    }

    // 4. Record successful payment and settlement in ledger (reconcile)
    const txId = responseData.transactionId || paymentId;
    const grossAmount = order.amount;
    const feeAmount = Math.round(grossAmount * 0.03); // Estimate 3% standard fee
    const netAmount = Math.max(grossAmount - feeAmount, 0);
    const eventId = this.makeId('portone_event');
    const settlementId = this.makeId('settlement');
    const createdAt = this.nowIso();

    // Prevent duplicate settlements if webhook already processed it
    const existingSettlement = await this.db.getSettlementByAttemptId(attempt.id);
    if (existingSettlement) {
      return {
        ok: true,
        replayed: true,
        receipt: {
          amount: grossAmount,
          method: attempt.provider,
          txId: attempt.providerCaptureId || '-',
          status: 'PAID',
        },
      };
    }

    // Save PortOne payload as provider_events
    await this.db.insertProviderEvent({
      id: this.makeId('event'),
      provider: 'portone',
      providerEventId: eventId,
      eventType: 'PAYMENT.COMPLETED',
      source: 'return',
      orderId: order.id,
      attemptId: attempt.id,
      signatureVerified: true,
      payload: responseData,
      receivedAt: createdAt,
    });

    // Update payment attempt status to CAPTURED
    await this.db.updatePaymentAttempt(attempt.id, {
      providerCaptureId: txId,
      status: 'CAPTURED' as PaymentAttemptStatus,
      lastEventId: eventId,
      updatedAt: createdAt,
    });

    // Update order status to PAID
    await this.db.updateOrderStatus(order.id, 'PAID', attempt.id);

    // Insert settlement record
    await this.db.insertSettlementRecord({
      id: settlementId,
      attemptId: attempt.id,
      orderId: order.id,
      currency: order.currency,
      grossAmount,
      feeAmount,
      netAmount,
      status: 'SETTLED',
      payoutReference: txId,
      createdAt,
      updatedAt: createdAt,
    });

    // Ledger Credit (gross amount)
    await this.db.insertLedgerEntry({
      id: this.makeId('ledger'),
      orderId: order.id,
      attemptId: attempt.id,
      settlementId,
      type: 'payment_captured',
      amount: grossAmount,
      currency: order.currency,
      direction: 'credit',
      createdAt,
      metadata: { provider: 'portone', txId },
    });

    // Ledger Debit (fee)
    if (feeAmount > 0) {
      await this.db.insertLedgerEntry({
        id: this.makeId('ledger'),
        orderId: order.id,
        attemptId: attempt.id,
        settlementId,
        type: 'provider_fee',
        amount: feeAmount,
        currency: order.currency,
        direction: 'debit',
        createdAt,
        metadata: { provider: 'portone', txId },
      });
    }

    // Audit log
    await this.db.insertAuditLog({
      id: this.makeId('audit'),
      entityType: 'payment_attempt',
      entityId: attempt.id,
      action: 'CAPTURED',
      actor: 'system',
      message: `PortOne payment ${paymentId} captured successfully. Amount: ${grossAmount}`,
      createdAt,
    });

    return {
      ok: true,
      replayed: false,
      receipt: {
        amount: grossAmount,
        method: attempt.provider,
        txId,
        status: 'PAID',
      },
    };
  }

  async handleWebhook(payload: any): Promise<any> {
    const paymentId = payload?.data?.paymentId || payload?.paymentId;
    if (!paymentId) {
      return { ok: true, ignored: true, reason: 'no_payment_id' };
    }

    const attempt = await this.db.getPaymentAttemptByProviderOrderId(paymentId);
    if (!attempt) {
      return { ok: true, ignored: true, reason: 'attempt_not_found_for_webhook', paymentId };
    }

    // Re-verify the payment status by pulling from PortOne API (highly secure)
    try {
      await this.verifyAndCompletePayment({
        paymentId,
        orderId: attempt.orderId,
      });
      return { ok: true, processed: true, paymentId };
    } catch (error) {
      console.warn('Webhook verification failed or already processed:', error.message);
      return { ok: true, processed: false, reason: error.message };
    }
  }
}
