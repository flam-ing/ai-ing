import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService, OrderRecord, OrderStatus, PaymentAttemptRecord } from '../database/database.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  private makeId(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  async getOrderById(orderId: string): Promise<OrderRecord> {
    const order = await this.db.getOrderById(orderId);
    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found.`);
    }
    return order;
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderRecord> {
    if (dto.amount <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const currency = (dto.currency || 'KRW').toUpperCase();
    const region = dto.region || 'domestic';
    const idempotencyKey = dto.idempotencyKey || this.makeId('idem');

    const existing = await this.db.getOrderByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    const orderId = this.makeId('order');
    const order = {
      id: orderId,
      idempotencyKey,
      orderType: 'donation',
      itemName: dto.itemName?.trim() || '에이아잉 교육 서비스 결제',
      region,
      amount: dto.amount, // KRW native, so we store amount as-is
      currency,
      note: dto.note?.trim() || '',
      status: 'CREATED' as OrderStatus,
      createdAt: this.nowIso(),
    };

    await this.db.insertOrder(order);
    await this.db.insertIdempotencyRecord({
      id: this.makeId('idemrec'),
      scope: 'orders.create',
      key: idempotencyKey,
      resourceType: 'order',
      resourceId: order.id,
      createdAt: order.createdAt,
    });

    await this.db.insertAuditLog({
      id: this.makeId('audit'),
      entityType: 'order',
      entityId: order.id,
      action: 'CREATED',
      actor: 'system',
      message: `Order was created with amount ${order.amount} ${order.currency}`,
      createdAt: order.createdAt,
    });

    // Return the created order record (with activePaymentAttemptId as null initially)
    return {
      ...order,
      activePaymentAttemptId: null,
      updatedAt: order.createdAt,
    };
  }

  async createPaymentAttempt(orderId: string): Promise<{ paymentId: string; attempt: PaymentAttemptRecord }> {
    const order = await this.getOrderById(orderId);
    if (order.status === 'PAID') {
      throw new BadRequestException('Order has already been paid.');
    }

    // Generate a PortOne-friendly paymentId: alphanumeric, under 32 chars
    const attemptId = this.makeId('attempt');
    const portonePaymentId = 'pay' + Date.now() + Math.random().toString(36).substring(2, 8);
    const createdAt = this.nowIso();

    const attempt = {
      id: attemptId,
      orderId: order.id,
      provider: 'portone',
      providerOrderId: portonePaymentId,
      providerCaptureId: null,
      status: 'CREATED' as const,
      checkoutUrl: '', // PortOne uses client-side SDK window, no redirect URL needed
      amount: order.amount,
      currency: order.currency,
      createdAt,
      updatedAt: createdAt,
    };

    await this.db.insertPaymentAttempt(attempt);
    await this.db.updateOrderStatus(order.id, 'PAYMENT_PENDING', attempt.id);

    await this.db.insertAuditLog({
      id: this.makeId('audit'),
      entityType: 'payment_attempt',
      entityId: attempt.id,
      action: 'CREATED',
      actor: 'system',
      message: `Payment attempt ${attempt.id} created with PortOne paymentId ${portonePaymentId}`,
      createdAt,
    });

    return {
      paymentId: portonePaymentId,
      attempt: {
        ...attempt,
        lastEventId: null,
      },
    };
  }
}
