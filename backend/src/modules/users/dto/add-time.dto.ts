import { IsIn, IsISO8601, IsOptional } from "class-validator";

export class AddTimeDto {
  @IsIn(["1d", "7d", "30d", "90d", "180d", "365d"])
  duration: "1d" | "7d" | "30d" | "90d" | "180d" | "365d";

  @IsOptional()
  @IsISO8601()
  start_time?: string;
}
