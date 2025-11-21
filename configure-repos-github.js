// GITHUB_TOKEN=github_pat_MORE_CHARACTERS node configure-repos-github.js
import { Octokit } from "@octokit/rest";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
// import { loadReposFromConfig } from "./sync-files-common.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not set");

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(ROOT_DIR, "repo-settings.json");

async function configureRepo(repo) {
  const [owner, repoName] = repo.split("/");

  console.log(`\nConfiguring repository: ${repo}`);

  const configPath = CONFIG_PATH;
  console.log(`Loading config from: ${configPath}`);

  const configContent = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(configContent);
  console.log(`Configuration loaded successfully\n`);

  // ========================================
  // CONFIGURE BRANCH PROTECTION RULES
  // ========================================
  if (config.branchProtection) {
    console.log("Configuring Branch Protection Rules\n");

    for (const [branch, rules] of Object.entries(config.branchProtection)) {
      console.log(`  Protecting branch: ${branch}`);

      try {
        await octokit.rest.repos.updateBranchProtection({
          owner,
          repo: repoName,
          branch,
          ...rules,
        });

        console.log(`  ✓ ${branch} configured successfully`);
      } catch (error) {
        console.error(`  ✗ Failed to configure ${branch}: ${error.message}`);
      }
    }
    console.log();
  } else {
    console.log("No branch protection rules found in config");
  }

  // ========================================
  // CONFIGURE ENVIRONMENTS
  // ========================================
  if (config.environments && config.environments.length > 0) {
    console.log("Configuring Environments\n");

    for (const env of config.environments) {
      console.log(`  Configuring environment: ${env.environment_name}`);

      try {
        await octokit.rest.repos.createOrUpdateEnvironment({
          owner,
          repo: repoName,
          environment_name: env.environment_name,
          wait_timer: env.wait_timer,
          prevent_self_review: env.prevent_self_review,
          reviewers: env.reviewers,
          deployment_branch_policy: env.deployment_branch_policy,
        });

        console.log(`  ✓ ${env.environment_name} configured successfully`);
      } catch (error) {
        console.error(
          `  ✗ Failed to configure ${env.environment_name}: ${error.message}`
        );
      }
    }
    console.log();
  } else {
    console.log("No environments found in config");
  }

  console.log(`✓ All repository settings applied for ${repo}!`);
}

async function main() {
  const repos = ["JonHolmanOrg/repo1"];

  console.log(`Configuring ${repos.length} repositories...\n`);

  for (const repo of repos) {
    try {
      await configureRepo(repo);
    } catch (err) {
      console.error(`\n✗ Failed to configure ${repo}:`, err);
    }
  }

  console.log(`\n✓ Configuration complete for all repositories!`);
}

main().catch(console.error);
