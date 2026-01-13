import { IsIn, IsISO8601, IsOptional } from "class-validator";

export class AddTimeDto {
  @IsIn(["1h", "1d", "1w", "1m", "1y"])
  duration: "1h" | "1d" | "1w" | "1m" | "1y";

  @IsOptional()
  @IsISO8601()
  start_time?: string;
}
