import type { z } from "zod";
import type {
  FrameSchema,
  GuildOwnedFrameSchema,
  UserOwnedFrameSchema,
} from "../frame";
import type {
  CanvasIdParamModel,
  FrameGuildIdsQueryModel,
  FrameIdParamModel,
  UserCanvasParamModel,
} from "../models";

export type Params = Partial<
  z.infer<typeof FrameIdParamModel> &
    z.infer<typeof CanvasIdParamModel> &
    z.infer<typeof UserCanvasParamModel>
>;

export type ResBody = z.infer<typeof FrameSchema>[];
export type ReqBody = Record<string, never>;
export type ReqQuery = z.input<typeof FrameGuildIdsQueryModel>;
export type FrameByIdResBody = z.infer<typeof FrameSchema>;

export interface UserFramesResBody {
  data: z.infer<typeof UserOwnedFrameSchema>[];
  hasReachedMaxFrames: boolean;
}
export interface GuildFramesResBody {
  data: z.infer<typeof GuildOwnedFrameSchema>[];
  hasReachedMaxFrames: {
    [guildId: string]: boolean;
  };
}
