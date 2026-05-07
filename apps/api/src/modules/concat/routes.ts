import type { FastifyPluginAsync } from "fastify";

import { concatClips } from "@app/worker";

interface ConcatBody {
  tenantId: string;
  projectId: string;
  userId: string;
  clipPaths: string[];
  fileName?: string;
  stepId?: string;
}

export const concatRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { jobId: string }; Body: ConcatBody }>(
    "/render-jobs/:jobId/concat",
    async (request, reply) => {
      // MVP: no auth middleware yet; caller provides userId.
      const res = await concatClips({
        tenantId: request.body.tenantId,
        projectId: request.body.projectId,
        jobId: request.params.jobId,
        clipPaths: request.body.clipPaths,
        fileName: request.body.fileName ?? "output.mp4",
        stepId: request.body.stepId ?? "concat",
      });

      return {
        ok: true,
        outputPath: res.outputPath,
      };
    }
  );
};
