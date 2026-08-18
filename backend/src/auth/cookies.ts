import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request, Response } from 'express';

const COOKIE_NAME = 'ask_repo_session';
const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

export interface SessionCookieValue {
  id?: string;
  hasSessionCookie: boolean;
}

export function readSessionCookie(
  request: Request,
  secret: string,
): SessionCookieValue {
  const value = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!value) return { id: undefined, hasSessionCookie: false };
  const [id, signature] = value.split('.');
  if (!id || !signature) return { id: undefined, hasSessionCookie: true };
  const expected = sign(id, secret);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return { id: undefined, hasSessionCookie: true };
  return { id, hasSessionCookie: true };
}

export function setSessionCookie(
  response: Response,
  id: string,
  secret: string,
  persistent: boolean,
) {
  response.cookie(COOKIE_NAME, `${id}.${sign(id, secret)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(persistent ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  });
}
export function clearSessionCookie(response: Response) {
  response.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
