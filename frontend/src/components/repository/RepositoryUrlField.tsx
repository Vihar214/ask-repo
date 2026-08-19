export function RepositoryUrlField() {
  return (
    <>
      <label
        className="block text-sm font-semibold uppercase tracking-[0.16em] text-pixel-muted"
        htmlFor="repository-url"
      >
        GitHub repository URL
      </label>
      <input
        id="repository-url"
        className="mt-3 min-h-12 w-full border border-pixel-border bg-white px-4 py-3 text-base text-pixel-text placeholder:text-pixel-muted"
        type="url"
        placeholder="https://github.com/owner/repository"
      />
    </>
  );
}
