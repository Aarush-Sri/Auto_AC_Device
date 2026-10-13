import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThermostatProvider } from '../context/ThermostatContext';
import ModeSelector from '../components/ModeSelector';

describe('ModeSelector Component', () => {
  it('renders Cool mode button without Eco, Heat, Auto, or Fan', () => {
    render(
      <ThermostatProvider>
        <ModeSelector />
      </ThermostatProvider>
    );

    expect(screen.getByText('Cool')).toBeInTheDocument();
    expect(screen.queryByText('Eco')).not.toBeInTheDocument();
    expect(screen.queryByText('Heat')).not.toBeInTheDocument();
    expect(screen.queryByText('Auto')).not.toBeInTheDocument();
    expect(screen.queryByText('Fan')).not.toBeInTheDocument();
  });

  it('renders Cool mode as active when system is powered on', async () => {
    render(
      <ThermostatProvider>
        <ModeSelector />
      </ThermostatProvider>
    );

    const coolButton = screen.getByText('Cool');
    expect(coolButton.closest('button')).toHaveClass('bg-primary-container');
  });
});
