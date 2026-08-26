import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';

import { useToast } from '../../../components/ui/ToastContext';
import type { RepositorySubmitInput } from '../models';
import { normalizeRepositoryUrl } from '../utils/repositoryUrl';

interface RepositoryUrlFieldProps {
  csrfToken: string;
  submitRepository: (params: RepositorySubmitInput) => Promise<unknown>;
}

type ConsentType = 'active_repository_exists' | 'repository_already_exists';

export function RepositoryUrlField({
  csrfToken,
  submitRepository,
}: RepositoryUrlFieldProps) {
  const [url, setUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [consentType, setConsentType] = useState<ConsentType | null>(null);
  const { toast } = useToast();

  const applyNormalization = () => {
    const normalized = normalizeRepositoryUrl(url);
    if (normalized !== url && normalized !== '') {
      setUrl(normalized);
      toast('URL normalized to GitHub repository format');
    }
    return normalized;
  };

  const clearConsent = () => {
    setConsentType(null);
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPrivate && !token) {
      setError('Private Repository Token is required');
      return;
    }

    setError('');

    try {
      await submitRepository({
        csrfToken,
        url: applyNormalization(),
        isPrivate,
        privateRepositoryToken: isPrivate ? token : null,
        replaceActiveRepository: consentType === 'active_repository_exists',
        reindexExistingRepository: consentType === 'repository_already_exists',
      });
      setUrl('');
      setToken('');
      setConsentType(null);
      toast('Repository submitted successfully');
    } catch (err) {
      const apiError = err as { code?: unknown; message?: unknown };
      const code = apiError.code;
      if (
        code === 'repository_already_exists' ||
        code === 'active_repository_exists'
      ) {
        setConsentType(code);
      } else {
        setConsentType(null);
      }
      setError(
        typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to submit repository.',
      );
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div>
        <label
          className="block text-sm font-semibold uppercase text-pixel-muted"
          htmlFor="repository-url"
        >
          GitHub repository URL
        </label>
        <input
          id="repository-url"
          className="mt-3 min-h-12 w-full border border-pixel-border bg-white px-4 py-3 text-base text-pixel-text placeholder:text-pixel-muted focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-pixel-text"
          type="url"
          placeholder="https://github.com/owner/repository"
          value={url}
          onBlur={applyNormalization}
          onChange={(event) => {
            setUrl(event.target.value);
            setConsentType(null);
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="is-private"
          type="checkbox"
          checked={isPrivate}
          onChange={(event) => {
            setIsPrivate(event.target.checked);
            if (!event.target.checked) {
              setToken('');
              setShowToken(false);
            }
          }}
        />
        <label htmlFor="is-private">Private repository</label>
      </div>

      {isPrivate && (
        <div>
          <label
            className="block text-sm font-semibold uppercase text-pixel-muted"
            htmlFor="private-token"
          >
            Private Repository Token
          </label>
          <div className="mt-3 flex items-center border border-pixel-border bg-white pr-2">
            <input
              id="private-token"
              className="min-h-12 w-full px-4 py-3 text-base text-pixel-text placeholder:text-pixel-muted focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-pixel-text"
              type={showToken ? 'text' : 'password'}
              value={token}
              maxLength={512}
              onChange={(event) => setToken(event.target.value)}
            />
            <button
              type="button"
              className="min-h-11 min-w-11 px-3 py-3 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-pixel-text"
              onClick={() => setShowToken((visible) => !visible)}
              aria-label={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? (
                <EyeOff className="h-5 w-5 text-pixel-muted" />
              ) : (
                <Eye className="h-5 w-5 text-pixel-muted" />
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-pixel-muted">
            Used only for this clone. Not stored.
          </p>
        </div>
      )}

      {error && (
        <p
          className="flex items-start gap-2 border border-pixel-border bg-pixel-surface-cream px-3 py-2 text-sm text-pixel-text"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {consentType ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="submit"
            className="min-h-12 border border-pixel-border bg-pixel-surface-dark px-4 py-3 font-semibold uppercase text-pixel-surface-light transition-colors hover:bg-pixel-text hover:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-pixel-text"
          >
            {consentType === 'repository_already_exists'
              ? 'Confirm reindex'
              : 'Confirm replace'}
          </button>
          <button
            type="button"
            className="min-h-12 border border-pixel-border bg-pixel-surface-light px-4 py-3 font-semibold uppercase text-pixel-text transition-colors hover:bg-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-pixel-text"
            onClick={clearConsent}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="submit"
          className="mt-2 min-h-12 border border-pixel-border bg-pixel-surface-dark px-4 py-3 font-semibold uppercase text-pixel-surface-light transition-colors hover:bg-pixel-text hover:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-pixel-text"
        >
          Submit repository
        </button>
      )}
    </form>
  );
}
