# GitLaunch Build Reporter

A GitHub Action to report builds and deployment status to [GitLaunch](https://gitlaunch.dev) for deployment management.

## Features

- Report new builds to GitLaunch when your CI pipeline completes
- Update deployment status as your workflow progresses
- Simple integration with any GitHub Actions workflow

## Usage

### Prerequisites

1. Sign up for GitLaunch and connect your repository
2. Create a service for your deployable component (e.g., "backend", "frontend")
3. Get your API key from the GitLaunch dashboard
4. Find your service ID in the GitLaunch settings
5. Add `GITLAUNCH_API_KEY` to your repository secrets

### Report a New Build

Use this in your CI workflow after a successful build:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test

      # Report successful build to GitLaunch
      - name: Report build to GitLaunch
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: report-build
          build-id: ${{ github.sha }}
```

### Update Deployment Status

Use this in your deployment workflow to report progress:

```yaml
name: Deploy

on:
  repository_dispatch:
    types: [deployment]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Mark deployment as in progress
      - name: Mark deployment started
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: update-status
          build-id: ${{ github.event.client_payload.build-id }}
          environment: ${{ github.event.client_payload.env }}
          status: deploying

      - name: Deploy to environment
        run: |
          # Your deployment script here
          ./deploy.sh ${{ github.event.client_payload.env }}

      # Mark deployment as complete
      - name: Mark deployment complete
        if: success()
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: update-status
          build-id: ${{ github.event.client_payload.build-id }}
          environment: ${{ github.event.client_payload.env }}
          status: deployed

      # Mark deployment as failed
      - name: Mark deployment failed
        if: failure()
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: update-status
          build-id: ${{ github.event.client_payload.build-id }}
          environment: ${{ github.event.client_payload.env }}
          status: error
```

### Complete CI/CD Example

A complete example with build and deployment in one workflow:

```yaml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      build-id: ${{ steps.report.outputs.build-id }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Report build
        id: report
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: report-build
          build-id: ${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Update status - deploying
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: update-status
          build-id: ${{ github.sha }}
          environment: staging
          status: deploying

      - name: Deploy to staging
        run: ./deploy.sh staging

      - name: Update status - deployed
        uses: donedgardo/build-reporter@v1
        with:
          api-key: ${{ secrets.GITLAUNCH_API_KEY }}
          service-id: ${{ vars.GITLAUNCH_SERVICE_ID }}
          action: update-status
          build-id: ${{ github.sha }}
          environment: staging
          status: deployed
```

## Inputs

| Input         | Description                                          | Required            | Default                 |
| ------------- | ---------------------------------------------------- | ------------------- | ----------------------- |
| `api-key`     | GitLaunch API key                                    | Yes                 | -                       |
| `api-url`     | GitLaunch API URL                                    | No                  | `https://gitlaunch.dev` |
| `service-id`  | GitLaunch service ID                                 | Yes                 | -                       |
| `action`      | Action to perform: `report-build` or `update-status` | Yes                 | `report-build`          |
| `build-id`    | Build identifier (commit SHA, build number, etc.)    | Yes                 | -                       |
| `environment` | Deployment environment (staging, prod)               | For `update-status` | -                       |
| `status`      | Deployment status                                    | For `update-status` | -                       |

### Valid Status Values

- `deploying` - Deployment is in progress
- `deployed` - Deployment completed successfully
- `error` - Deployment failed
- `cancelled` - Deployment was cancelled

## Outputs

| Output              | Description                    |
| ------------------- | ------------------------------ |
| `build-id`          | The build ID that was reported |
| `deployment-status` | The current deployment status  |

## Security

- Always store your API key in GitHub Secrets, never commit it to your repository
- Use environment protection rules for production deployments
- The API key should have appropriate scopes (`builds:write`, `deployments:write`)

## Publishing to GitHub Marketplace

To publish this action to the GitHub Marketplace:

1. Create a separate repository `gitlaunch/build-reporter`
2. Copy the contents of the `github-action/` directory to that repo
3. Install dependencies: `yarn install`
4. Build the action: `yarn build` (generates `dist/index.js`)
5. Commit the `dist/` directory (required for GitHub Actions)
6. Create a GitHub release with semantic versioning (e.g., v1.0.0)
7. In the release, check "Publish this Action to the GitHub Marketplace"
8. Add a v1 tag that points to the latest v1.x.x release for users using `@v1`

## License

MIT
