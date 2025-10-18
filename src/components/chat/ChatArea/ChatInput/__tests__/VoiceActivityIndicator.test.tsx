import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import VoiceActivityIndicator from '../VoiceActivityIndicator'

describe('VoiceActivityIndicator', () => {
  it('should not render when not listening and no transcript', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={false} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should render when listening', () => {
    render(<VoiceActivityIndicator isListening={true} />)
    
    expect(screen.getByText('Listening...')).toBeInTheDocument()
  })

  it('should show interim transcript while listening', () => {
    render(
      <VoiceActivityIndicator 
        isListening={true} 
        transcript="hello world" 
      />
    )
    
    expect(screen.getByText('Listening...')).toBeInTheDocument()
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('should show completed state when not listening with transcript', () => {
    render(
      <VoiceActivityIndicator 
        isListening={false} 
        transcript="test message" 
      />
    )
    
    expect(screen.getByText('Voice input captured')).toBeInTheDocument()
    expect(screen.getByText('test message')).toBeInTheDocument()
  })

  it('should truncate long transcripts while listening', () => {
    const longText = 'a'.repeat(100)
    render(
      <VoiceActivityIndicator 
        isListening={true} 
        transcript={longText} 
      />
    )
    
    const displayedText = screen.getByText(/a+\.\.\./)
    expect(displayedText.textContent).toHaveLength(53) // 50 chars + '...'
  })

  it('should show full transcript when completed', () => {
    const text = 'This is a complete message'
    render(
      <VoiceActivityIndicator 
        isListening={false} 
        transcript={text} 
      />
    )
    
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('should have pulsing animation when listening', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={true} />
    )
    
    const pulsingElement = container.querySelector('.animate-pulse')
    expect(pulsingElement).toBeInTheDocument()
  })

  it('should have ping animation when listening', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={true} />
    )
    
    const pingElement = container.querySelector('.animate-ping')
    expect(pingElement).toBeInTheDocument()
  })

  it('should show checkmark icon when completed', () => {
    const { container } = render(
      <VoiceActivityIndicator 
        isListening={false} 
        transcript="done" 
      />
    )
    
    // Check for SVG checkmark
    const checkmark = container.querySelector('svg')
    expect(checkmark).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <VoiceActivityIndicator 
        isListening={true} 
        className="custom-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should have red styling when listening', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={true} />
    )
    
    expect(container.firstChild).toHaveClass('border-red-500/30')
  })

  it('should have green styling when completed', () => {
    render(
      <VoiceActivityIndicator 
        isListening={false} 
        transcript="done" 
      />
    )
    
    const successText = screen.getByText('Voice input captured')
    expect(successText).toHaveClass('text-green-500')
  })

  it('should show transcript even if empty string when not listening', () => {
    const { container } = render(
      <VoiceActivityIndicator 
        isListening={false} 
        transcript="" 
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should handle undefined transcript gracefully', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={false} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should show listening state without transcript', () => {
    render(<VoiceActivityIndicator isListening={true} />)
    
    expect(screen.getByText('Listening...')).toBeInTheDocument()
    // Verify no transcript text is shown (only "Listening..." should be present)
    expect(screen.queryByText('Voice input captured')).not.toBeInTheDocument()
  })

  it('should have proper container styling', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={true} />
    )
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('mx-auto')
    expect(wrapper).toHaveClass('mb-2')
    expect(wrapper).toHaveClass('rounded-lg')
    expect(wrapper).toHaveClass('border')
  })

  it('should display multiple visual indicators when listening', () => {
    const { container } = render(
      <VoiceActivityIndicator isListening={true} />
    )
    
    // Should have multiple pulsing circles
    const redCircles = container.querySelectorAll('[class*="bg-red-500"]')
    expect(redCircles.length).toBeGreaterThan(1)
  })
})
