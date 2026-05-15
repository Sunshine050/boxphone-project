import { IsNumber, Min, IsOptional, IsString, MaxLength } from "class-validator";

export class BulkAddTimeDto {
  @IsNumber()
  @Min(1)
  add_seconds: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
