import { IsNumber, Min } from "class-validator";

export class ReduceTimeDto {
  @IsNumber()
  @Min(1)
  seconds: number;
}
