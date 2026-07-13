import contract from "./contract/reporter-contract.golden.json";

type CIOutcome = "success" | "failure" | "cancelled";

/**
 * Provider-neutral status core, driven by the vendored golden vector that is
 * pinned byte-identical to the GitLaunch server's copy (see the drift contract
 * test in the main repo). The reporter no longer owns any status logic of its
 * own — this is PROV-03's "thin wrapper over the provider-neutral reporter".
 */

// A GitHub job status ("success" | "failure" | "cancelled" | "") maps to a CI
// outcome. Anything that is not success/cancelled is treated as a failure —
// identical to the reporter's previous inline switch default.
export function jobStatusToDeploymentStatus(jobStatus: string): string {
  const normalized = jobStatus.toLowerCase();
  const outcome: CIOutcome =
    normalized === "success"
      ? "success"
      : normalized === "cancelled"
        ? "cancelled"
        : "failure";
  return contract.outcomeToStatus[outcome];
}

export const REPORTER_STATUSES: string[] = contract.reporterStatuses;
