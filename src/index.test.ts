import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @actions/core
const mockGetInput = vi.fn();
const mockSetOutput = vi.fn();
const mockSetFailed = vi.fn();
const mockInfo = vi.fn();

vi.mock("@actions/core", () => ({
  getInput: (name: string, options?: { required?: boolean }) =>
    mockGetInput(name, options),
  setOutput: (name: string, value: string) => mockSetOutput(name, value),
  setFailed: (message: string) => mockSetFailed(message),
  info: (message: string) => mockInfo(message),
}));

// Mock @actions/http-client
const mockPostJson = vi.fn();
const mockPatchJson = vi.fn();

vi.mock("@actions/http-client", () => ({
  HttpClient: vi.fn().mockImplementation(() => ({
    postJson: mockPostJson,
    patchJson: mockPatchJson,
  })),
}));

describe("GitLaunch Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("report-build action", () => {
    it("should report a build successfully", async () => {
      // Given: valid inputs
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "api-key": "pk_test_key",
          "api-url": "https://gitlaunch.io",
          "service-id": "service123",
          action: "report-build",
          "build-id": "abc123",
        };
        return inputs[name] || "";
      });

      mockPostJson.mockResolvedValue({
        statusCode: 201,
        result: {
          _id: "build-id-123",
          buildId: "abc123",
          deployments: {},
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      });

      // When: action runs
      await import("./index");

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: build is reported
      expect(mockPostJson).toHaveBeenCalledWith(
        "https://gitlaunch.io/api/v1/services/service123/builds",
        { buildId: "abc123" },
      );
      expect(mockSetOutput).toHaveBeenCalledWith("build-id", "abc123");
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it("should handle API errors", async () => {
      // Given: valid inputs but API returns error
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "api-key": "pk_test_key",
          "api-url": "https://gitlaunch.io",
          "service-id": "service123",
          action: "report-build",
          "build-id": "abc123",
        };
        return inputs[name] || "";
      });

      mockPostJson.mockResolvedValue({
        statusCode: 401,
        result: { error: "Invalid API key" },
      });

      // When: action runs
      await import("./index");

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: error is set
      expect(mockSetFailed).toHaveBeenCalledWith("Invalid API key");
    });
  });

  describe("update-status action", () => {
    it("should update deployment status successfully", async () => {
      // Given: valid inputs for status update
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "api-key": "pk_test_key",
          "api-url": "https://gitlaunch.io",
          "service-id": "service123",
          action: "update-status",
          "build-id": "abc123",
          environment: "staging",
          status: "deployed",
        };
        return inputs[name] || "";
      });

      mockPatchJson.mockResolvedValue({
        statusCode: 200,
        result: {
          _id: "build-id-123",
          buildId: "abc123",
          deployments: { staging: "deployed" },
          updatedAt: "2024-01-01T00:00:00Z",
        },
      });

      // When: action runs
      await import("./index");

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: status is updated
      expect(mockPatchJson).toHaveBeenCalledWith(
        "https://gitlaunch.io/api/v1/services/service123/builds/abc123/deploy/staging",
        { status: "deployed" },
      );
      expect(mockSetOutput).toHaveBeenCalledWith(
        "deployment-status",
        "deployed",
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it("should fail when environment is missing", async () => {
      // Given: missing environment
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "api-key": "pk_test_key",
          "api-url": "https://gitlaunch.io",
          "service-id": "service123",
          action: "update-status",
          "build-id": "abc123",
          status: "deployed",
        };
        return inputs[name] || "";
      });

      // When: action runs
      await import("./index");

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: error is set
      expect(mockSetFailed).toHaveBeenCalledWith(
        "environment is required for update-status action",
      );
    });

    it("should fail when status is invalid", async () => {
      // Given: invalid status
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "api-key": "pk_test_key",
          "api-url": "https://gitlaunch.io",
          "service-id": "service123",
          action: "update-status",
          "build-id": "abc123",
          environment: "staging",
          status: "invalid-status",
        };
        return inputs[name] || "";
      });

      // When: action runs
      await import("./index");

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: error is set
      expect(mockSetFailed).toHaveBeenCalledWith(
        "Invalid status: invalid-status. Must be one of: deploying, deployed, error, cancelled",
      );
    });
  });

  describe("invalid action", () => {
    it("should fail with invalid action type", async () => {
      // Given: invalid action
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "api-key": "pk_test_key",
          "api-url": "https://gitlaunch.io",
          "service-id": "service123",
          action: "invalid-action",
          "build-id": "abc123",
        };
        return inputs[name] || "";
      });

      // When: action runs
      await import("./index");

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: error is set
      expect(mockSetFailed).toHaveBeenCalledWith(
        "Invalid action: invalid-action. Must be 'report-build' or 'update-status'",
      );
    });
  });
});
