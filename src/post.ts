import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { jobStatusToDeploymentStatus } from "./reporterCore";

async function run(): Promise<void> {
  try {
    const apiKey = core.getState("api_key");
    const apiUrl = core.getState("api_url");
    const serviceId = core.getState("service_id");
    const environment = core.getState("environment");
    const buildId = core.getState("build_id");

    // No state means main step didn't run in deploy mode — exit silently
    if (!apiKey || !serviceId) {
      return;
    }

    const status = jobStatusToDeploymentStatus(
      process.env.GITHUB_JOB_STATUS || "",
    );

    core.info(
      `Reporting final status '${status}' for build ${buildId} in ${environment}...`,
    );

    const client = new HttpClient("gitlaunch-action", [], {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const url = `${apiUrl}/api/v1/services/${serviceId}/builds/${buildId}/deploy/${environment}`;
    await client.patchJson(url, { status });

    core.info(`Final status '${status}' reported successfully`);
  } catch (error) {
    // Use warning, not setFailed — don't fail the job in the post step
    if (error instanceof Error) {
      core.warning(`GitLaunch post step failed: ${error.message}`);
    } else {
      core.warning("GitLaunch post step failed: unexpected error");
    }
  }
}

run();
