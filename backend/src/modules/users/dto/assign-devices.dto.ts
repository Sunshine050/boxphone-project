import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class AssignDeviceItemDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  assign_seconds?: number;
}

export class AssignDevicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignDeviceItemDto)
  items: AssignDeviceItemDto[];
}
