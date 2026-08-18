export function RepositoryUrlField() {
  return (
    <>
      <label className="repo-input-label" htmlFor="repository-url">
        GitHub repository URL
      </label>
      <input
        id="repository-url"
        className="repo-input"
        type="url"
        placeholder="https://github.com/owner/repository"
      />
    </>
  );
}
