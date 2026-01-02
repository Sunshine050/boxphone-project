import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { ConfigService } from "@nestjs/config";
export function getCorsConfig(configService: ConfigService): CorsOptions {
  const origin = configService.get<string>("CORS_ORIGIN") || "*";
  const methods =
    configService.get<string>("CORS_METHODS") ||
    "GET,HEAD,PUT,PATCH,POST,DELETE";
  const credentials = configService.get<boolean>("CORS_CREDENTIALS") !== false;

  return {
    origin: origin === "*" ? "*" : origin.split(",").map((o) => o.trim()),
    methods: methods.split(",").map((m) => m.trim()) as any,
    credentials,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [],
    maxAge: 86400, 
  };
}
