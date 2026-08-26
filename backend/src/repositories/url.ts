export type RepositoryUrlNormalizationResult =
  | {
      normalizedUrl: string;
      githubOwner: string;
      githubRepo: string;
    }
  | { error: 'invalid_url' | 'unsupported_url' | 'token_in_url_rejected' };

export function normalizeGitHubRepositoryUrl(
  url: string,
): RepositoryUrlNormalizationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'invalid_url' };
  }

  if (parsed.username || parsed.password) {
    return { error: 'token_in_url_rejected' };
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    return { error: 'unsupported_url' };
  }

  const pathParts = parsed.pathname.replace(/\/$/, '').split('/');
  if (pathParts.length !== 3 || !pathParts[1] || !pathParts[2]) {
    return { error: 'unsupported_url' };
  }

  const githubOwner = pathParts[1].toLowerCase();
  let githubRepo = pathParts[2].toLowerCase();
  if (githubRepo.endsWith('.git')) {
    githubRepo = githubRepo.slice(0, -4);
  }

  if (!githubRepo) {
    return { error: 'unsupported_url' };
  }

  return {
    normalizedUrl: `https://github.com/${githubOwner}/${githubRepo}`,
    githubOwner,
    githubRepo,
  };
}
