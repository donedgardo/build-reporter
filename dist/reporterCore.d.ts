/**
 * Provider-neutral status core, driven by the vendored golden vector that is
 * pinned byte-identical to the GitLaunch server's copy (see the drift contract
 * test in the main repo). The reporter no longer owns any status logic of its
 * own — this is PROV-03's "thin wrapper over the provider-neutral reporter".
 */
export declare function jobStatusToDeploymentStatus(jobStatus: string): string;
export declare const REPORTER_STATUSES: string[];
