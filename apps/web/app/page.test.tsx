import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { loadTestSession } from '@/lib/test-session'
import WelcomePage from './welcome/page'
import { ThemeProvider } from '@/lib/theme-provider'

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock matchMedia for light/dark mode check
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('WelcomePage', () => {
  it('offers hard mode for both section practice and the 180-minute full exam', () => {
    localStorage.clear();
    render(<ThemeProvider><WelcomePage /></ThemeProvider>);
    expect(screen.getByText('180')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Modo difícil/ }));
    fireEvent.click(screen.getByRole('button', { name: 'INICIAR' }));
    expect(loadTestSession()).toMatchObject({ mode: 'full', timeLeft: 10800, hardMode: true });
    fireEvent.click(screen.getByRole('button', { name: 'Geometría' }));
    fireEvent.click(screen.getByRole('button', { name: 'INICIAR' }));
    expect(loadTestSession()).toMatchObject({ mode: 'Geometría', hardMode: true });
  });

  it('renders the welcome page heading' , () => {
    render(
      <ThemeProvider>
        <WelcomePage />
      </ThemeProvider>
    )
    
    const heading = screen.getByRole('heading', {
      name: /Matemáticas/i,
    })
    
    expect(heading).toBeInTheDocument()
  })
})
