import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import {
  type PlacementConfig,
  placementConfig,
} from "@/config/placement.config";

@Injectable()
export class BotApiKeyGuard implements CanActivate {
  constructor(
    @Inject(placementConfig.KEY) private readonly config: PlacementConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.header("x-api-key");
    if (!apiKey || !this.config.botApiKey || apiKey !== this.config.botApiKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    return true;
  }
}
