import { Config } from '../config.js';
import { GitHubIdentity } from './store.js';

export interface GitHubOAuthClient {
  authorizationUrl(state: string): string;
  exchange(code: string): Promise<GitHubIdentity>;
}

export class HttpGitHubOAuthClient implements GitHubOAuthClient {
  constructor(private readonly config: Config) {}

  authorizationUrl(state: string) {
    if (!this.config.GITHUB_CLIENT_ID || !this.config.GITHUB_CALLBACK_URL)
      throw new Error('GitHub OAuth is not configured');
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', this.config.GITHUB_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.config.GITHUB_CALLBACK_URL);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchange(code: string): Promise<GitHubIdentity> {
    if (
      !this.config.GITHUB_CLIENT_ID ||
      !this.config.GITHUB_CLIENT_SECRET ||
      !this.config.GITHUB_CALLBACK_URL
    )
      throw new Error('GitHub OAuth is not configured');
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams({
          client_id: this.config.GITHUB_CLIENT_ID,
          client_secret: this.config.GITHUB_CLIENT_SECRET,
          redirect_uri: this.config.GITHUB_CALLBACK_URL,
          code,
        }),
      },
    );
    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !tokenData.access_token)
      throw new Error('GitHub token exchange failed');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const user = (await userResponse.json()) as {
      id?: number;
      login?: string;
      avatar_url?: string | null;
      email?: string | null;
    };
    if (!userResponse.ok || !user.id || !user.login)
      throw new Error('GitHub identity lookup failed');
    return {
      id: String(user.id),
      login: user.login,
      avatarUrl: user.avatar_url ?? null,
      email: user.email ?? null,
    };
  }
}
