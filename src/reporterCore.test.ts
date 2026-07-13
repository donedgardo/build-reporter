import { describe, it, expect } from "vitest";
import { jobStatusToDeploymentStatus, REPORTER_STATUSES } from "./reporterCore";

describe("reporterCore", () => {
  describe("jobStatusToDeploymentStatus", () => {
    it("should report 'deployed' when the job succeeded", () => {
      expect(jobStatusToDeploymentStatus("success")).toBe("deployed");
    });

    it("should report 'cancelled' when the job was cancelled", () => {
      expect(jobStatusToDeploymentStatus("cancelled")).toBe("cancelled");
    });

    it("should report 'error' when the job failed", () => {
      expect(jobStatusToDeploymentStatus("failure")).toBe("error");
    });

    it("should report 'error' for an empty or unknown job status", () => {
      expect(jobStatusToDeploymentStatus("")).toBe("error");
      expect(jobStatusToDeploymentStatus("something-else")).toBe("error");
    });

    it("should be case-insensitive", () => {
      expect(jobStatusToDeploymentStatus("SUCCESS")).toBe("deployed");
    });
  });

  describe("REPORTER_STATUSES", () => {
    it("should expose the reporter status vocabulary from the golden vector", () => {
      expect(REPORTER_STATUSES).toEqual([
        "deploying",
        "deployed",
        "error",
        "cancelled",
      ]);
    });
  });
});
