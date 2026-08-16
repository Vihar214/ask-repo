import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('Frontend Shell', () => {
  it('renders app shell and hero content', () => {
    render(<App />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getAllByText('Ask Repo').length).toBeGreaterThan(0);
    expect(screen.getByText(/Chat with your GitHub repository codebases/i)).toBeInTheDocument();
  });
});
