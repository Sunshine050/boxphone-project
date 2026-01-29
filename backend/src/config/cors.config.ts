import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { ConfigService } from "@nestjs/config";
export function getCorsConfig(configService: ConfigService): CorsOptions {
  const origin = configService.get<string>("CORS_ORIGIN") || "*";
  const methods =
    configService.get<string>("CORS_METHODS") ||
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS";
  const credentials = configService.get<boolean>("CORS_CREDENTIALS") !== false;

  // Default origins for development
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
  ];

  return {
    origin: true, // Allow all origins in development
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
