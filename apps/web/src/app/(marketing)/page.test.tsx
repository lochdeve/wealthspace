import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home page', () => {
  it('shows the Wealthspace title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1, name: 'Wealthspace' })).toBeInTheDocument();
  });

  it('links to login and register', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
  });
});
