import { randomBytes } from 'node:crypto';

import { Config } from '../config.js';
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from './cookies.js';
import { GitHubOAuthClient, HttpGitHubOAuthClient } from './github-oauth.js';
import { AuthStore, SessionRecord, UserRecord } from './store.js';

const GUEST_TTL_MS = 24 * 60 * 60 * 1000;
const LOGGED_IN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const createSecureToken = () => randomBytes(32).toString('base64url');
const now = () => new Date();

export interface AuthServiceDependencies {
  store: AuthStore;
  oauth?: GitHubOAuthClient;
  clock?: () => Date;
}

export interface SessionResponse {
  session: {
    kind: SessionRecord['kind'];
    expiresAt: string;
    csrfToken: string;
    recovered: boolean;
  };
  user: {
    githubUsername: string;
    avatarUrl: string | null;
    email: string | null;
  } | null;
}

export interface SessionLookupResult {
  session?: SessionRecord;
  recovered: boolean;
}

export class AuthService {
  private readonly clock;
  private readonly oauth;

  constructor(
    private readonly config: Config,
    private readonly dependencies: AuthServiceDependencies,
  ) {
    this.clock = dependencies.clock ?? now;
    this.oauth = dependencies.oauth ?? new HttpGitHubOAuthClient(config);
  }

  serializeSession(
    session: SessionRecord,
    user?: UserRecord,
    recovered = false,
  ): SessionResponse {
    return {
      session: {
        kind: session.kind,
        expiresAt: session.expiresAt.toISOString(),
        csrfToken: session.csrfToken,
        recovered,
      },
      user: user
        ? {
            githubUsername: user.githubUsername,
            avatarUrl: user.avatarUrl,
            email: user.email,
          }
        : null,
    };
  }

  async createGuestSession() {
    const current = this.clock();
    return this.dependencies.store.createSession(
      'guest',
      null,
      createSecureToken(),
      new Date(current.getTime() + GUEST_TTL_MS),
      current,
    );
  }

  setSessionCookie(
    response: { cookie: (...args: any[]) => void },
    id: string,
    persistent: boolean,
  ) {
    setSessionCookie(
      response as never,
      id,
      this.config.SESSION_SECRET,
      persistent,
    );
  }

  clearSessionCookie(response: { clearCookie: (...args: any[]) => void }) {
    clearSessionCookie(response as never);
  }

  async findLiveSession(request: { headers: { cookie?: string } }) {
    const cookie = readSessionCookie(
      request as never,
      this.config.SESSION_SECRET,
    );
    if (!cookie.id)
      return {
        session: undefined,
        recovered: cookie.hasSessionCookie,
      } satisfies SessionLookupResult;
    const session = await this.dependencies.store.getSession(cookie.id);
    if (!session || session.expiresAt <= this.clock()) {
      if (session) await this.dependencies.store.deleteSession(session.id);
      return {
        session: undefined,
        recovered: true,
      } satisfies SessionLookupResult;
    }
    return { session, recovered: false } satisfies SessionLookupResult;
  }

  async bootstrapSession(
    request: { headers: { cookie?: string } },
    response: { cookie: (...args: any[]) => void },
  ) {
    const found = await this.findLiveSession(request);
    if (!found.session) {
      const session = await this.createGuestSession();
      this.setSessionCookie(response, session.id, false);
      return this.serializeSession(session, undefined, found.recovered);
    }
    const current = this.clock();
    if (found.session.kind === 'logged_in') {
      const expiry = new Date(current.getTime() + LOGGED_IN_TTL_MS);
      await this.dependencies.store.updateSession(found.session.id, {
        expiresAt: expiry,
        lastSeenAt: current,
      });
      found.session.expiresAt = expiry;
      found.session.lastSeenAt = current;
      this.setSessionCookie(response, found.session.id, true);
    }
    const user = found.session.userId
      ? await this.dependencies.store.getUser(found.session.userId)
      : undefined;
    return this.serializeSession(found.session, user);
  }

  async beginGitHubLogin(
    request: { headers: { cookie?: string } },
    response: { cookie: (...args: any[]) => void },
  ) {
    const found = await this.findLiveSession(request);
    let session = found.session;
    if (!session) {
      session = await this.createGuestSession();
    }
    const state = createSecureToken();
    await this.dependencies.store.updateSession(session.id, {
      oauthState: state,
      oauthStateExpiresAt: new Date(
        this.clock().getTime() + OAUTH_STATE_TTL_MS,
      ),
    });
    this.setSessionCookie(response, session.id, session.kind === 'logged_in');
    return this.oauth.authorizationUrl(state);
  }

  async completeGitHubLogin(
    request: { headers: { cookie?: string }; query: Record<string, unknown> },
    response: { cookie: (...args: any[]) => void },
  ) {
    let priorSession: SessionRecord | undefined;
    try {
      const found = await this.findLiveSession(request);
      priorSession = found.session;
      const state =
        typeof request.query.state === 'string'
          ? request.query.state
          : undefined;
      const code =
        typeof request.query.code === 'string' ? request.query.code : undefined;
      if (
        !found.session ||
        !state ||
        !code ||
        request.query.error ||
        found.session.oauthState !== state ||
        !found.session.oauthStateExpiresAt ||
        found.session.oauthStateExpiresAt <= this.clock()
      ) {
        await this.preserveSessionAfterFailedLogin(found.session, response);
        return this.config.FRONTEND_URL;
      }
      const identity = await this.oauth.exchange(code);
      const current = this.clock();
      const user = await this.dependencies.store.upsertUser(identity, current);
      await this.dependencies.store.deleteSession(found.session.id);
      const session = await this.dependencies.store.createSession(
        'logged_in',
        user.id,
        createSecureToken(),
        new Date(current.getTime() + LOGGED_IN_TTL_MS),
        current,
      );
      this.setSessionCookie(response, session.id, true);
      return this.config.FRONTEND_URL;
    } catch (error) {
      await this.preserveSessionAfterFailedLogin(priorSession, response);
      return this.config.FRONTEND_URL;
    }
  }

  private async preserveSessionAfterFailedLogin(
    session: SessionRecord | undefined,
    response: { cookie: (...args: any[]) => void },
  ) {
    if (!session) {
      const guest = await this.createGuestSession();
      this.setSessionCookie(response, guest.id, false);
      return;
    }
    await this.dependencies.store.updateSession(session.id, {
      oauthState: null,
      oauthStateExpiresAt: null,
    });
    session.oauthState = null;
    session.oauthStateExpiresAt = null;
    this.setSessionCookie(response, session.id, session.kind === 'logged_in');
  }

  requiresCsrf(
    request: { get(name: string): string | undefined },
    session: SessionRecord,
  ) {
    return request.get('x-csrf-token') === session.csrfToken;
  }

  async logout(
    request: { headers: { cookie?: string } },
    response: { clearCookie: (...args: any[]) => void },
  ) {
    const found = await this.findLiveSession(request);
    if (found.session?.kind === 'logged_in')
      await this.dependencies.store.deleteSession(found.session.id);
    this.clearSessionCookie(response);
  }

  async deleteAccount(
    userId: string,
    response: { clearCookie: (...args: any[]) => void },
  ) {
    await this.dependencies.store.deleteAccount(userId);
    this.clearSessionCookie(response);
  }
}
