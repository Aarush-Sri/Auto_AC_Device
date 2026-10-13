import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThermostatProvider } from '../context/ThermostatContext';
import ServoControls from '../components/ServoControls';
import { bleService } from '../services/bleService';

describe('ServoControls Component', () => {
  it('renders servo position actuator header and buttons', () => {
    render(
      <ThermostatProvider>
        <ServoControls />
      </ThermostatProvider>
    );

    expect(screen.getByText('Servo Position Actuator')).toBeDefined();
    expect(screen.getByRole('button', { name: /increment servo position/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /decrement servo position/i })).toBeDefined();
    expect(screen.getByRole('slider', { name: /servo position slider/i })).toBeDefined();
  });

  it('increments servo position when increment button is clicked', async () => {
    const spy = vi.spyOn(bleService, 'writeServoPosition').mockResolvedValue({
      success: true,
      position: 10,
      hex: '31 30'
    });
    bleService.isConnected = true;

    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <ServoControls />
      </ThermostatProvider>
    );

    const incButton = screen.getByRole('button', { name: /increment servo position/i });
    await user.click(incButton);

    expect(spy).toHaveBeenCalledWith(10);
    expect(screen.getByTestId('servo-angle-readout').textContent).toBe('10°');

    spy.mockRestore();
  });

  it('changes increment step and applies preset angles', async () => {
    const spy = vi.spyOn(bleService, 'writeServoPosition').mockResolvedValue({
      success: true,
      position: 90,
      hex: '39 30'
    });
    bleService.isConnected = true;

    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <ServoControls />
      </ThermostatProvider>
    );

    // Click +45° step selector
    const step45Btn = screen.getByRole('button', { name: '+45°' });
    await user.click(step45Btn);

    // Click 90° Mid preset
    const preset90Btn = screen.getByRole('button', { name: '90° Mid' });
    await user.click(preset90Btn);

    expect(spy).toHaveBeenCalledWith(90);
    expect(screen.getByTestId('servo-angle-readout').textContent).toBe('90°');

    // Now clicking increment increments by 45° (from 90 to 135)
    const incButton = screen.getByRole('button', { name: /increment servo position/i });
    await user.click(incButton);

    expect(spy).toHaveBeenCalledWith(135);
    expect(screen.getByTestId('servo-angle-readout').textContent).toBe('135°');

    spy.mockRestore();
  });

  it('renders compact mode with increment button', async () => {
    const spy = vi.spyOn(bleService, 'writeServoPosition').mockResolvedValue({
      success: true,
      position: 10,
      hex: '31 30'
    });
    bleService.isConnected = true;

    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <ServoControls compact={true} />
      </ThermostatProvider>
    );

    const incButton = screen.getByRole('button', { name: /increment servo position/i });
    await user.click(incButton);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
