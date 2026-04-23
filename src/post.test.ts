import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @actions/core
const mockGetState = vi.fn();
const mockWarning = vi.fn();
const mockInfo = vi.fn();

vi.mock("@actions/core", () => ({
  getState: (name: string) => mockGetState(name),
  warning: (message: string) => mockWarning(message),
  info: (message: string) => mockInfo(message),
}));

// Mock @actions/http-client
const mockPatchJson = vi.fn();

vi.mock("@actions/http-client", () => ({
  HttpClient: vi.fn().mockImplementation(() => ({
    patchJson: mockPatchJson,
  })),
}));

describe("GitLaunch Post Step", () => {
  const savedEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...savedEnv };
    delete process.env.GITHUB_JOB_STATUS;
  });

  afterEach(() => {
    vi.resetModules();
    process.env = savedEnv;
  });

  it("should report 'deployed' when job succeeded", async () => {
    // Given: main step saved state and job succeeded
    mockGetState.mockImplementation((name: string) => {
      const state: Record<string, string> = {
        api_key: "pk_test_key",
        api_url: "https://gitlaunch.io",
        service_id: "service123",
        environment: "staging",
        build_id: "abc123",
      };
      return state[name] || "";
    });
    process.env.GITHUB_JOB_STATUS = "success";

    mockPatchJson.mockResolvedValue({ statusCode: 200, result: {} });

    // When: post step runs
    await import("./post");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then: deployed status is reported
    expect(mockPatchJson).toHaveBeenCalledWith(
      "https://gitlaunch.io/api/v1/services/service123/builds/abc123/deploy/staging",
      { status: "deployed" },
    );
  });

  it("should report 'error' when job failed", async () => {
    // Given: main step saved state and job failed
    mockGetState.mockImplementation((name: string) => {
      const state: Record<string, string> = {
        api_key: "pk_test_key",
        api_url: "https://gitlaunch.io",
        service_id: "service123",
        environment: "staging",
        build_id: "abc123",
      };
      return state[name] || "";
    });
    process.env.GITHUB_JOB_STATUS = "failure";

    mockPatchJson.mockResolvedValue({ statusCode: 200, result: {} });

    // When: post step runs
    await import("./post");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then: error status is reported
    expect(mockPatchJson).toHaveBeenCalledWith(
      "https://gitlaunch.io/api/v1/services/service123/builds/abc123/deploy/staging",
      { status: "error" },
    );
  });

  it("should report 'cancelled' when job was cancelled", async () => {
    // Given: main step saved state and job was cancelled
    mockGetState.mockImplementation((name: string) => {
      const state: Record<string, string> = {
        api_key: "pk_test_key",
        api_url: "https://gitlaunch.io",
        service_id: "service123",
        environment: "staging",
        build_id: "abc123",
      };
      return state[name] || "";
    });
    process.env.GITHUB_JOB_STATUS = "cancelled";

    mockPatchJson.mockResolvedValue({ statusCode: 200, result: {} });

    // When: post step runs
    await import("./post");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then: cancelled status is reported
    expect(mockPatchJson).toHaveBeenCalledWith(
      "https://gitlaunch.io/api/v1/services/service123/builds/abc123/deploy/staging",
      { status: "cancelled" },
    );
  });

  it("should exit silently when no state exists", async () => {
    // Given: no state saved (main step was skipped or not deploy mode)
    mockGetState.mockReturnValue("");

    // When: post step runs
    await import("./post");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then: no API call is made
    expect(mockPatchJson).not.toHaveBeenCalled();
  });

  it("should use warning not setFailed when post step has an error", async () => {
    // Given: state exists but API call fails
    mockGetState.mockImplementation((name: string) => {
      const state: Record<string, string> = {
        api_key: "pk_test_key",
        api_url: "https://gitlaunch.io",
        service_id: "service123",
        environment: "staging",
        build_id: "abc123",
      };
      return state[name] || "";
    });
    process.env.GITHUB_JOB_STATUS = "success";

    mockPatchJson.mockRejectedValue(new Error("Network error"));

    // When: post step runs
    await import("./post");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then: warning is used, not setFailed (don't fail the job in post step)
    expect(mockWarning).toHaveBeenCalledWith(
      expect.stringContaining("Network error"),
    );
  });
});
