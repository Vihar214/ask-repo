import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('Frontend Shell', () => {
  it('renders guest warning and repository shell after bootstrap', async () => {
    render(
      <App
        getSession={async () => ({
          session: {
            kind: 'guest',
            expiresAt: '2026-01-01T00:00:00.000Z',
            csrfToken: 'csrf',
            recovered: false,
          },
          user: null,
        })}
      />,
    );
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getAllByText('Ask Repo').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Chat with your GitHub repository codebases/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Using Ask Repo as a guest/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/temporary/i);
    expect(screen.getByLabelText(/GitHub repository URL/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Log in with GitHub/i }),
    ).toBeInTheDocument();
  });

  it('renders logged-in controls without the guest warning', async () => {
    render(
      <App
        getSession={async () => ({
          session: {
            kind: 'logged_in',
            expiresAt: '2026-01-01T00:00:00.000Z',
            csrfToken: 'csrf',
            recovered: false,
          },
          user: { githubUsername: 'octo', avatarUrl: null, email: null },
        })}
      />,
    );
    expect(await screen.findByText(/Logged in as octo/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Log out/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Delete account/i }),
    ).toBeInTheDocument();
  });

  it('returns to Guest Session state after account deletion', async () => {
    const states = [
      {
        session: {
          kind: 'logged_in',
          expiresAt: '2026-01-01T00:00:00.000Z',
          csrfToken: 'csrf',
          recovered: false,
        },
        user: { githubUsername: 'octo', avatarUrl: null, email: null },
      },
      {
        session: {
          kind: 'guest',
          expiresAt: '2026-01-01T00:00:00.000Z',
          csrfToken: 'next-csrf',
          recovered: false,
        },
        user: null,
      },
    ] as const;
    let index = 0;
    render(
      <App
        getSession={async () => states[Math.min(index++, states.length - 1)]}
        mutateSession={async () => {}}
      />,
    );

    expect(await screen.findByText(/Logged in as octo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Delete account/i }));
    expect(
      await screen.findByText(/Using Ask Repo as a guest/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/temporary/i);
  });

  it('returns to Guest Session state after logout', async () => {
    const states = [
      {
        session: {
          kind: 'logged_in',
          expiresAt: '2026-01-01T00:00:00.000Z',
          csrfToken: 'csrf',
          recovered: false,
        },
        user: { githubUsername: 'octo', avatarUrl: null, email: null },
      },
      {
        session: {
          kind: 'guest',
          expiresAt: '2026-01-01T00:00:00.000Z',
          csrfToken: 'next-csrf',
          recovered: false,
        },
        user: null,
      },
    ] as const;
    let index = 0;
    render(
      <App
        getSession={async () => states[Math.min(index++, states.length - 1)]}
        mutateSession={async () => {}}
      />,
    );

    expect(await screen.findByText(/Logged in as octo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Log out/i }));
    expect(
      await screen.findByText(/Using Ask Repo as a guest/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/temporary/i);
  });
});
