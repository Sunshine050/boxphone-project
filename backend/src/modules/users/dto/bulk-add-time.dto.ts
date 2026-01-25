import { IsNumber, Min } from "class-validator";

export class BulkAddTimeDto {
  @IsNumber()
  @Min(1)
  add_seconds: number;
}
