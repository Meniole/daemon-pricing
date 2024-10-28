import { ContextPlugin } from "../types/plugin-input";

async function checkIfIsAdmin(context: ContextPlugin, username: string) {
  const response = await context.octokit.rest.repos.getCollaboratorPermissionLevel({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    username,
  });
  return response.data.permission === "admin";
}

async function checkIfIsBillingManager(context: ContextPlugin, username: string) {
  if (!context.payload.organization) throw context.logger.error(`No organization found in payload!`);

  try {
    await context.octokit.rest.orgs.checkMembershipForUser({
      org: context.payload.organization.login,
      username,
    });
  } catch (e: unknown) {
    return false;
  }

  const { data: membership } = await context.octokit.rest.orgs.getMembershipForUser({
    org: context.payload.organization.login,
    username,
  });
  return membership.role === "billing_manager";
}

export async function isUserAdminOrBillingManager(context: ContextPlugin, username: string): Promise<"admin" | "billing_manager" | false> {
  const isAdmin = await checkIfIsAdmin(context, username);
  if (isAdmin) return "admin";

  const isBillingManager = await checkIfIsBillingManager(context, username);
  if (isBillingManager) return "billing_manager";

  return false;
}

export async function addCommentToIssue(context: ContextPlugin, message: string, issueNumber: number, owner?: string, repo?: string) {
  const payload = context.payload;
  try {
    await context.octokit.rest.issues.createComment({
      owner: owner ?? payload.repository.owner.login,
      repo: repo ?? payload.repository.name,
      issue_number: issueNumber,
      body: message,
    });
  } catch (e: unknown) {
    context.logger.error("Adding a comment failed!", { e });
  }
}
