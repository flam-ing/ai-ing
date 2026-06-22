import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(dto);
    return { ok: true, replayed: false, order };
  }

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.ordersService.getOrderById(orderId);
    return { ok: true, order };
  }

  @Post(':orderId/payment-attempts/portone')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentAttempt(@Param('orderId') orderId: string) {
    const { paymentId, attempt } = await this.ordersService.createPaymentAttempt(orderId);
    return { ok: true, orderId, paymentId, attempt };
  }
}
