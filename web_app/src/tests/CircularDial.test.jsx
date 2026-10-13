import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThermostatProvider } from '../context/ThermostatContext';
import CircularDial from '../components/CircularDial';

describe('CircularDial Component', () => {
  it('renders target temperature, buttons, and prominent current temp at the top without humidity', () => {
    render(
      <ThermostatProvider>
        <CircularDial />
      </ThermostatProvider>
    );

    expect(screen.getByText('Target Temperature')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('Current Temp')).toBeInTheDocument();
    expect(screen.queryByText('device_thermostat')).not.toBeInTheDocument();
    expect(screen.queryByText(/RH/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increase temperature/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decrease temperature/i })).toBeInTheDocument();
  });

  it('increments temperature when plus button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <CircularDial />
      </ThermostatProvider>
    );

    const plusBtn = screen.getByRole('button', { name: /increase temperature/i });
    await user.click(plusBtn);

    expect(screen.getByText('71')).toBeInTheDocument();
  });

  it('decrements temperature when minus button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <CircularDial />
      </ThermostatProvider>
    );

    const minusBtn = screen.getByRole('button', { name: /decrease temperature/i });
    await user.click(minusBtn);

    expect(screen.getByText('69')).toBeInTheDocument();
  });
});
