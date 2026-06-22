import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  itemName?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  idempotencyKey: string;
}
