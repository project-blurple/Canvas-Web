import type { DiscordUserProfile } from "@blurple-canvas-web/types/src/discordUserProfile";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/errors";
import {
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";
import {
  assertLoggedIn,
  requireCanvasAdmin,
  requireCanvasModerator,
  requireLoggedIn,
} from "./canvasAuth";

vi.mock("@/services/discordGuildService");

describe("canvasAuth", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser: DiscordUserProfile = {
    id: "123456789",
    username: "user",
    profilePictureUrl: "https://example.com/avatar.png",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      user: mockUser,
      session: {
        discordAccessToken: "test-token",
      } as Request["session"] & { discordAccessToken: string },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe("assertLoggedIn", () => {
    it("should not throw when user and token are present", () => {
      expect(() => assertLoggedIn(mockReq as Request)).not.toThrow();
    });

    it("should throw UnauthorizedError when user is missing", () => {
      mockReq.user = undefined;
      expect(() => assertLoggedIn(mockReq as Request)).toThrow(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when token is missing", () => {
      mockReq.session = {} as Request["session"] & {
        discordAccessToken?: string;
      };
      expect(() => assertLoggedIn(mockReq as Request)).toThrow(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when both user and token are missing", () => {
      mockReq.user = undefined;
      mockReq.session = {} as Request["session"] & {
        discordAccessToken?: string;
      };
      expect(() => assertLoggedIn(mockReq as Request)).toThrow(
        UnauthorizedError,
      );
    });

    it("should have correct error message", () => {
      mockReq.user = undefined;
      try {
        assertLoggedIn(mockReq as Request);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toBe(
          "User is not authenticated",
        );
      }
    });
  });

  describe("requireLoggedIn", () => {
    it("should call next() with no error when user is authenticated", () => {
      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should forward an UnauthorizedError when user is not authenticated", () => {
      mockReq.user = undefined;

      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should forward an UnauthorizedError when token is missing", () => {
      mockReq.session = {} as Request["session"] & {
        discordAccessToken?: string;
      };

      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe("requireCanvasModerator", () => {
    it("should call next() with no error when user is a moderator", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(true);

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should forward a ForbiddenError when user is not a moderator", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(false);

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("should forward an UnauthorizedError when user is not logged in", async () => {
      mockReq.user = undefined;

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call isCanvasModerator with correct access token", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(true);

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(vi.mocked(isCanvasModerator)).toHaveBeenCalledWith("test-token");
    });

    it("should forward an error whose message describes the missing permission", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(false);

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You do not have permission to perform this action",
        }),
      );
    });
  });

  describe("requireCanvasAdmin", () => {
    it("should call next() with no error when user is an admin", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should forward a ForbiddenError when user is not an admin", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(false);

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("should forward an UnauthorizedError when user is not logged in", async () => {
      mockReq.user = undefined;

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call isCanvasAdmin with correct access token", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(vi.mocked(isCanvasAdmin)).toHaveBeenCalledWith("test-token");
    });

    it("should forward an error whose message describes the missing permission", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(false);

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You do not have permission to perform this action",
        }),
      );
    });
  });
});
