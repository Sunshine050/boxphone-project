import { ValidationPipeOptions } from "@nestjs/common";
export function getValidationPipeConfig(): ValidationPipeOptions {
  return {
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true, 
    transformOptions: {
      enableImplicitConversion: true,
    },
  };
}

/**
 * Logger Configuration
 */
export function getLoggerConfig(): (
  | "error"
  | "warn"
  | "log"
  | "debug"
  | "verbose"
)[] {
  return ["error", "warn", "log", "debug", "verbose"];
}
