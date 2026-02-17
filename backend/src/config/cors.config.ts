import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { ConfigService } from "@nestjs/config";
export function getCorsConfig(configService: ConfigService): CorsOptions {
  const methods =
    configService.get<string>("CORS_METHODS") ||
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS";
  const credentials = configService.get<boolean>("CORS_CREDENTIALS") !== false;

  // CORS_ORIGINS = คั่นด้วย comma เช่น "http://localhost:3000,https://admin.example.com"
  // ไม่ตั้ง = อนุญาตทุก origin (development)
  const originsEnv = configService.get<string>("CORS_ORIGINS");
  const origin = originsEnv
    ? originsEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : true;

  return {
    origin,
    methods: methods.split(",").map((m) => m.trim()) as any,
    credentials: true,
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposedHeaders: [],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}
