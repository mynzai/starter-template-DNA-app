import { render, screen } from '@testing-library/react'
import { Hero } from '../hero'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

describe('Hero Component', () => {
  it('renders the main heading', () => {
    render(<Hero />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/Transform Your Business with AI Power/)
  })
  
  it('renders the description text', () => {
    render(<Hero />)
    
    const description = screen.getByText(/Harness the power of artificial intelligence/)
    expect(description).toBeInTheDocument()
  })
  
  it('renders call-to-action buttons', () => {
    render(<Hero />)
    
    const startTrialButton = screen.getByRole('link', { name: /start free trial/i })
    const watchDemoButton = screen.getByRole('link', { name: /watch demo/i })
    
    expect(startTrialButton).toBeInTheDocument()
    expect(watchDemoButton).toBeInTheDocument()
  })
  
  it('has correct links for CTA buttons', () => {
    render(<Hero />)
    
    const startTrialButton = screen.getByRole('link', { name: /start free trial/i })
    const watchDemoButton = screen.getByRole('link', { name: /watch demo/i })
    
    expect(startTrialButton).toHaveAttribute('href', '/auth/signup')
    expect(watchDemoButton).toHaveAttribute('href', '/demo')
  })
  
  it('has proper semantic structure', () => {
    render(<Hero />)
    
    const section = screen.getByRole('banner', { hidden: true }) || 
                   screen.getByText(/Transform Your Business/).closest('section')
    
    expect(section).toBeInTheDocument()
  })
  
  it('renders gradient background elements', () => {
    const { container } = render(<Hero />)
    
    // Check for gradient background classes
    const gradientElements = container.querySelectorAll('.gradient-bg, .bg-gradient-to-r, .bg-gradient-to-br')
    expect(gradientElements.length).toBeGreaterThan(0)
  })
  
  it('is accessible', () => {
    render(<Hero />)
    
    // Check for proper heading hierarchy
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
    
    // Check that buttons are properly labeled
    const buttons = screen.getAllByRole('link')
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName()
    })
  })
  
  it('matches snapshot', () => {
    const { container } = render(<Hero />)
    expect(container.firstChild).toMatchSnapshot()
  })
})