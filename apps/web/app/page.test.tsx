import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
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
  it('renders the welcome page heading', () => {
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
