import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";

type ActionType = "report-build" | "update-status";

interface BuildResponse {
  _id: string;
  buildId: string;
  deployments: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  error: string;
}

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput("api-key", { required: true });
    const apiUrl = core.getInput("api-url") || "https://gitlaunch.dev";
    const serviceId = core.getInput("service-id", { required: true });
    const action = core.getInput("action", { required: true }) as ActionType;
    const buildId = core.getInput("build-id", { required: true });
    const environment = core.getInput("environment");
    const status = core.getInput("status");

    const client = new HttpClient("gitlaunch-action", [], {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const baseUrl = `${apiUrl}/api/v1/services/${serviceId}`;

    switch (action) {
      case "report-build": {
        core.info(`Reporting build ${buildId} to GitLaunch...`);
        const response = await client.postJson<BuildResponse | ErrorResponse>(
          `${baseUrl}/builds`,
          { buildId },
        );

        if (response.statusCode === 201 || response.statusCode === 200) {
          const result = response.result as BuildResponse;
          core.info(`Build ${buildId} reported successfully`);
          core.setOutput("build-id", result.buildId);
          core.setOutput(
            "deployment-status",
            JSON.stringify(result.deployments),
          );
        } else {
          const error = response.result as ErrorResponse;
          throw new Error(
            error?.error || `Failed with status ${response.statusCode}`,
          );
        }
        break;
      }

      case "update-status": {
        if (!environment) {
          throw new Error("environment is required for update-status action");
        }
        if (!status) {
          throw new Error("status is required for update-status action");
        }

        const validStatuses = ["deploying", "deployed", "error", "cancelled"];
        if (!validStatuses.includes(status)) {
          throw new Error(
            `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`,
          );
        }

        core.info(
          `Updating deployment status for build ${buildId} in ${environment} to ${status}...`,
        );

        const response = await client.patchJson<BuildResponse | ErrorResponse>(
          `${baseUrl}/builds/${buildId}/deploy/${environment}`,
          { status },
        );

        if (response.statusCode === 200) {
          const result = response.result as BuildResponse;
          core.info(`Deployment status updated successfully`);
          core.setOutput("build-id", result.buildId);
          core.setOutput(
            "deployment-status",
            result.deployments[environment] || status,
          );
        } else {
          const error = response.result as ErrorResponse;
          throw new Error(
            error?.error || `Failed with status ${response.statusCode}`,
          );
        }
        break;
      }

      default:
        throw new Error(
          `Invalid action: ${action}. Must be 'report-build' or 'update-status'`,
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
