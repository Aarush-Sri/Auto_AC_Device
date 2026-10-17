import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThermostatProvider } from '../context/ThermostatContext';
import ClimateControlView from '../views/ClimateControlView';

describe('ClimateControlView Component', () => {
  it('renders hero title, dial, and telemetry cards without fan or humidity', () => {
    render(
      <ThermostatProvider>
        <ClimateControlView />
      </ThermostatProvider>
    );

    expect(screen.getByText('Smart Thermostat')).toBeInTheDocument();
    expect(screen.getByText('Target Temperature')).toBeInTheDocument();
    expect(screen.getByText('Current Temp')).toBeInTheDocument();
    expect(screen.queryByText('Humidity')).not.toBeInTheDocument();
    expect(screen.queryByText(/Blower & Airflow Velocity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Servo Position Actuator/i)).not.toBeInTheDocument();
  });
});
