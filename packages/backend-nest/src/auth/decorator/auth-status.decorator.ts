import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { isLoggedIn } from "@/auth/util/is-logged-in.util";

export const AuthStatus = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    return isLoggedIn(request);
  },
);
