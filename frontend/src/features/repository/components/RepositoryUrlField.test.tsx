import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../components/ui/ToastContext';
import { RepositoryUrlField } from './RepositoryUrlField';

const renderRepositoryUrlField = (props: {
  csrfToken: string;
  submitRepository: ReturnType<typeof vi.fn>;
}) =>
  render(
    <ToastProvider>
      <RepositoryUrlField {...props} />
    </ToastProvider>,
  );

describe('RepositoryUrlField', () => {
  it('normalizes supported GitHub Repository URLs on blur and shows reusable toast feedback', async () => {
    const submitRepository = vi.fn();
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    const input = screen.getByLabelText(/GitHub repository URL/i);
    fireEvent.change(input, {
      target: { value: 'https://github.com/OpenAI/Foo.git?tab=readme#intro' },
    });
    fireEvent.blur(input);

    expect(input).toHaveValue('https://github.com/openai/foo');
    expect(
      await screen.findByText(/URL normalized to GitHub repository format/i),
    ).toBeInTheDocument();
  });

  it('submits normalized public Repository URLs without token material', async () => {
    const submitRepository = vi.fn().mockResolvedValue(undefined);
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    fireEvent.change(screen.getByLabelText(/GitHub repository URL/i), {
      target: { value: 'https://github.com/OpenAI/Foo.git' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    await waitFor(() => {
      expect(submitRepository).toHaveBeenCalledWith({
        csrfToken: 'csrf',
        url: 'https://github.com/openai/foo',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });
    });
  });

  it('reveals a private token field with show and hide controls', () => {
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository: vi.fn() });

    expect(
      screen.queryByLabelText(/Private Repository Token/i),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('checkbox', { name: /Private repository/i }),
    );

    const token = screen.getByLabelText(/Private Repository Token/i);
    expect(token).toHaveAttribute('type', 'password');
    expect(
      screen.getByText(/Used only for this clone. Not stored./i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show token/i }));
    expect(token).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /Hide token/i }));
    expect(token).toHaveAttribute('type', 'password');
  });

  it('rejects private submission with an empty token before calling the API', async () => {
    const submitRepository = vi.fn();
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    fireEvent.change(screen.getByLabelText(/GitHub repository URL/i), {
      target: { value: 'https://github.com/openai/private' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Private repository/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    expect(
      await screen.findByText(/Private Repository Token is required/i),
    ).toBeInTheDocument();
    expect(submitRepository).not.toHaveBeenCalled();
  });

  it('submits Private Repository Tokens only when private mode is explicit', async () => {
    const submitRepository = vi.fn().mockResolvedValue(undefined);
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    fireEvent.change(screen.getByLabelText(/GitHub repository URL/i), {
      target: { value: 'https://github.com/openai/private' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Private repository/i }),
    );
    fireEvent.change(screen.getByLabelText(/Private Repository Token/i), {
      target: { value: 'ghp_private_token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    await waitFor(() => {
      expect(submitRepository).toHaveBeenCalledWith({
        csrfToken: 'csrf',
        url: 'https://github.com/openai/private',
        isPrivate: true,
        privateRepositoryToken: 'ghp_private_token',
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });
    });
  });

  it('retries with replacement consent after an Active Repository conflict', async () => {
    const error = new Error(
      'Submitting a new repository will delete your current guest repository.',
    ) as Error & { code: string };
    error.code = 'active_repository_exists';
    const submitRepository = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    fireEvent.change(screen.getByLabelText(/GitHub repository URL/i), {
      target: { value: 'https://github.com/openai/next' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /delete your current guest repository/i,
    );
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm replace/i }));

    await waitFor(() => {
      expect(submitRepository).toHaveBeenLastCalledWith(
        expect.objectContaining({ replaceActiveRepository: true }),
      );
    });
  });

  it('retries with reindex consent after a duplicate Repository conflict', async () => {
    const error = new Error(
      'This repository already exists. Reindexing will replace the old index after the new one succeeds.',
    ) as Error & { code: string };
    error.code = 'repository_already_exists';
    const submitRepository = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    fireEvent.change(screen.getByLabelText(/GitHub repository URL/i), {
      target: { value: 'https://github.com/openai/foo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /reindexing will replace the old index/i,
    );
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm reindex/i }));

    await waitFor(() => {
      expect(submitRepository).toHaveBeenLastCalledWith(
        expect.objectContaining({ reindexExistingRepository: true }),
      );
    });
  });

  it('cancels duplicate Repository consent without sending a reindex flag', async () => {
    const error = new Error(
      'This repository already exists. Reindexing will replace the old index after the new one succeeds.',
    ) as Error & { code: string };
    error.code = 'repository_already_exists';
    const submitRepository = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    renderRepositoryUrlField({ csrfToken: 'csrf', submitRepository });

    fireEvent.change(screen.getByLabelText(/GitHub repository URL/i), {
      target: { value: 'https://github.com/openai/foo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /reindexing will replace the old index/i,
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Submit repository/i }));

    await waitFor(() => {
      expect(submitRepository).toHaveBeenLastCalledWith(
        expect.objectContaining({ reindexExistingRepository: false }),
      );
    });
  });
});
