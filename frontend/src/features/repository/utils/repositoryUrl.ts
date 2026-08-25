export function normalizeRepositoryUrl(inputUrl: string) {
  try {
    const parsed = new URL(inputUrl.trim());
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
      return inputUrl;
    }

    const pathParts = parsed.pathname.replace(/\/$/, '').split('/');
    if (pathParts.length !== 3 || !pathParts[1] || !pathParts[2]) {
      return inputUrl;
    }

    let githubRepo = pathParts[2].toLowerCase();
    if (githubRepo.endsWith('.git')) {
      githubRepo = githubRepo.slice(0, -4);
    }

    return `https://github.com/${pathParts[1].toLowerCase()}/${githubRepo}`;
  } catch {
    return inputUrl;
  }
}
