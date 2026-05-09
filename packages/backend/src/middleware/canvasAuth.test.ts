import type { DiscordUserProfile } from "@blurple-canvas-web/types/src/discordUserProfile";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ForbiddenError, UnauthorizedError } from "@/errors";
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
    username: "testuser",
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
    it("should call next when user is authenticated", () => {
      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should send error when user is not authenticated", () => {
      mockReq.user = undefined;
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);

      expect(sendErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should send error when token is missing", () => {
      mockReq.session = {} as Request["session"] & {
        discordAccessToken?: string;
      };
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);

      expect(sendErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should pass error object to ApiError.sendError", () => {
      mockReq.user = undefined;
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      requireLoggedIn(mockReq as Request, mockRes as Response, mockNext);

      const passedError = sendErrorSpy.mock.calls[0][1];
      expect(passedError).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("requireCanvasModerator", () => {
    it("should call next when user is a moderator", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(true);

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should send ForbiddenError when user is not a moderator", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(false);
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(sendErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      const passedError = sendErrorSpy.mock.calls[0][1];
      expect(passedError).toBeInstanceOf(ForbiddenError);
    });

    it("should send UnauthorizedError when user is not logged in", async () => {
      mockReq.user = undefined;
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(sendErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      const passedError = sendErrorSpy.mock.calls[0][1];
      expect(passedError).toBeInstanceOf(UnauthorizedError);
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

    it("should have correct error message for non-moderators", async () => {
      vi.mocked(isCanvasModerator).mockResolvedValueOnce(false);
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      await requireCanvasModerator(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      const passedError = sendErrorSpy.mock.calls[0][1] as ForbiddenError;
      expect(passedError.message).toBe(
        "You do not have permission to perform this action",
      );
    });
  });

  describe("requireCanvasAdmin", () => {
    it("should call next when user is an admin", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should send ForbiddenError when user is not an admin", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(false);
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(sendErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      const passedError = sendErrorSpy.mock.calls[0][1];
      expect(passedError).toBeInstanceOf(ForbiddenError);
    });

    it("should send UnauthorizedError when user is not logged in", async () => {
      mockReq.user = undefined;
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(sendErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      const passedError = sendErrorSpy.mock.calls[0][1];
      expect(passedError).toBeInstanceOf(UnauthorizedError);
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

    it("should have correct error message for non-admins", async () => {
      vi.mocked(isCanvasAdmin).mockResolvedValueOnce(false);
      const sendErrorSpy = vi.spyOn(ApiError, "sendError");

      await requireCanvasAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      const passedError = sendErrorSpy.mock.calls[0][1] as ForbiddenError;
      expect(passedError.message).toBe(
        "You do not have permission to perform this action",
      );
    });
  });
});
