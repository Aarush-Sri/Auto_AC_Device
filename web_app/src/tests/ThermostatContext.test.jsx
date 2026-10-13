import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThermostatProvider, useThermostat } from '../context/ThermostatContext';
import { bleService } from '../services/bleService';

function TestConsumer() {
  const {
    activeZone,
    adjustSetpoint,
    setSetpoint,
    togglePower,
    setMode,
    toggleUnit,
    unit,
    formatTemp,
    servoPosition,
    servoStep,
    setServoStep,
    incrementServoPosition,
    decrementServoPosition,
    setServoPosition,
    resetServoPosition
  } = useThermostat();

  return (
    <div>
      <span data-testid="power-state">{activeZone.power ? 'ON' : 'OFF'}</span>
      <span data-testid="temp">{formatTemp(activeZone.temp)}</span>
      <span data-testid="setpoint">{formatTemp(activeZone.setpoint)}</span>
      <span data-testid="mode">{activeZone.mode}</span>
      <span data-testid="unit">{unit}</span>
      <span data-testid="servo-position">{servoPosition}</span>
      <span data-testid="servo-step">{servoStep}</span>

      <button onClick={() => adjustSetpoint(1)}>Increase</button>
      <button onClick={() => adjustSetpoint(-1)}>Decrease</button>
      <button onClick={() => setSetpoint(76.5)}>SetCustom</button>
      <button onClick={togglePower}>Power</button>
      <button onClick={() => setMode('heat')}>HeatMode</button>
      <button onClick={toggleUnit}>ToggleUnit</button>
      <button onClick={() => incrementServoPosition()}>IncrementServo</button>
      <button onClick={() => incrementServoPosition(15)}>IncrementServo15</button>
      <button onClick={() => decrementServoPosition()}>DecrementServo</button>
      <button onClick={() => setServoPosition(90)}>SetServo90</button>
      <button onClick={() => resetServoPosition()}>ResetServo</button>
      <button onClick={() => setServoStep(5)}>SetStep5</button>
    </div>
  );
}

describe('ThermostatContext', () => {
  it('provides default thermostat state and values', () => {
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    expect(screen.getByTestId('power-state').textContent).toBe('ON');
    expect(screen.getByTestId('setpoint').textContent).toBe('70');
    expect(screen.getByTestId('mode').textContent).toBe('cool');
    expect(screen.getByTestId('unit').textContent).toBe('F');
    expect(screen.getByTestId('servo-position').textContent).toBe('0');
  });

  it('adjusts setpoint up and down', async () => {
    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    const increaseBtn = screen.getByText('Increase');
    await user.click(increaseBtn);
    expect(screen.getByTestId('setpoint').textContent).toBe('71');

    const decreaseBtn = screen.getByText('Decrease');
    await user.click(decreaseBtn);
    await user.click(decreaseBtn);
    expect(screen.getByTestId('setpoint').textContent).toBe('69');
  });

  it('toggles power state and mode correctly', async () => {
    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    const heatBtn = screen.getByText('HeatMode');
    await user.click(heatBtn);
    expect(screen.getByTestId('mode').textContent).toBe('heat');

    const powerBtn = screen.getByText('Power');
    await user.click(powerBtn);
    expect(screen.getByTestId('power-state').textContent).toBe('OFF');
  });

  it('converts and toggles Fahrenheit to Celsius unit', async () => {
    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    const unitBtn = screen.getByText('ToggleUnit');
    await user.click(unitBtn);
    expect(screen.getByTestId('unit').textContent).toBe('C');
    // 70 F = 21.1 C
    expect(screen.getByTestId('setpoint').textContent).toBe('21.1');
  });

  it('updates room ambient temp from BLE without overriding user chosen setpoint', () => {
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    expect(screen.getByTestId('setpoint').textContent).toBe('70');

    // Simulate incoming BLE temperature reading from sensor characteristic (e.g. 25.0°C = 77°F)
    act(() => {
      bleService._notifyTemperature(25.0, '00 00 C8 41');
    });

    // Ambient room temp should update to 77°F
    expect(screen.getByTestId('temp').textContent).toBe('77');
    // Setpoint must REMAIN at user-chosen 70°F
    expect(screen.getByTestId('setpoint').textContent).toBe('70');
  });

  it('transmits setpoint to BLE writeSetpoint when setpoint changes', async () => {
    const spy = vi.spyOn(bleService, 'writeSetpoint').mockResolvedValue({ success: true, value: 76.5, hex: '00 00 99 42' });
    bleService.isConnected = true;

    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    const setBtn = screen.getByText('SetCustom');
    await user.click(setBtn);

    expect(spy).toHaveBeenCalledWith(76.5);
    spy.mockRestore();
  });

  it('transmits on/off servo command to BLE when power is toggled', async () => {
    const spy = vi.spyOn(bleService, 'writeServo').mockResolvedValue({ success: true, command: 'off' });
    bleService.isConnected = true;

    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    const powerBtn = screen.getByText('Power');
    await user.click(powerBtn);

    expect(spy).toHaveBeenCalledWith('off');
    spy.mockRestore();
  });

  it('increments, decrements, and sets servo position transmitting to BLE', async () => {
    const spy = vi.spyOn(bleService, 'writeServoPosition').mockResolvedValue({ success: true, position: 10, hex: '31 30' });
    bleService.isConnected = true;

    const user = userEvent.setup();
    render(
      <ThermostatProvider>
        <TestConsumer />
      </ThermostatProvider>
    );

    const incBtn = screen.getByText('IncrementServo');
    await user.click(incBtn);
    expect(screen.getByTestId('servo-position').textContent).toBe('10');
    expect(spy).toHaveBeenCalledWith(10);

    const inc15Btn = screen.getByText('IncrementServo15');
    await user.click(inc15Btn);
    expect(screen.getByTestId('servo-position').textContent).toBe('25');
    expect(spy).toHaveBeenCalledWith(25);

    const set90Btn = screen.getByText('SetServo90');
    await user.click(set90Btn);
    expect(screen.getByTestId('servo-position').textContent).toBe('90');
    expect(spy).toHaveBeenCalledWith(90);

    const decBtn = screen.getByText('DecrementServo');
    await user.click(decBtn);
    expect(screen.getByTestId('servo-position').textContent).toBe('80');
    expect(spy).toHaveBeenCalledWith(80);

    const resetBtn = screen.getByText('ResetServo');
    await user.click(resetBtn);
    expect(screen.getByTestId('servo-position').textContent).toBe('0');
    expect(spy).toHaveBeenCalledWith(0);

    spy.mockRestore();
  });
});
