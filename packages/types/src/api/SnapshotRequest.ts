import type { z } from "zod";
import type { CanvasIdParamModel } from "../models";
import type { SnapshotImageParamModel } from "../models/snapshot.models";
import type { SnapshotManifestSchema } from "../snapshot";

export type Params = z.infer<typeof CanvasIdParamModel>;
export type ResBody = z.infer<typeof SnapshotManifestSchema>[];
export type ReqBody = Record<string, never>;
export type ReqQuery = Record<string, never>;

export type ImageParams = z.infer<typeof SnapshotImageParamModel>;
