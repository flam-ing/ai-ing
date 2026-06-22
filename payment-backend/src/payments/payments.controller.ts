import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('api/v1/payments/complete')
  @HttpCode(HttpStatus.OK)
  async completePayment(@Body() dto: VerifyPaymentDto) {
    const result = await this.paymentsService.verifyAndCompletePayment(dto);
    return result;
  }

  @Post('api/v1/webhooks/portone')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    const result = await this.paymentsService.handleWebhook(payload);
    return result;
  }
}
