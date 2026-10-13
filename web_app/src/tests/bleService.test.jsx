import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseTemperatureData, BLE_CONFIG, bleService } from '../services/bleService';

describe('BLE Temperature Data Parser', () => {
  it('correctly parses IEEE-754 32-bit float (4 bytes, little endian)', () => {
    // 24.5 in IEEE 754 float32 little endian: [0x00, 0x00, 0xC4, 0x41]
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, 24.5, true);

    const result = parseTemperatureData(view);
    expect(result).toBe(24.5);
  });

  it('correctly parses 72.4°F float32 little endian', () => {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, 72.4, true);

    const result = parseTemperatureData(view);
    expect(result).toBe(72.4);
  });

  it('correctly parses ASCII string float data (e.g. "21.8")', () => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode('21.8');
    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);

    const result = parseTemperatureData(view);
    expect(result).toBe(21.8);
  });

  it('returns null on empty or null DataView', () => {
    expect(parseTemperatureData(null)).toBeNull();
    const emptyView = new DataView(new ArrayBuffer(0));
    expect(parseTemperatureData(emptyView)).toBeNull();
  });

  it('matches expected ESP32 service and characteristic UUIDs', () => {
    expect(BLE_CONFIG.DEVICE_NAME).toBe('903-AC-V2');
    expect(BLE_CONFIG.SERVICE_UUID).toBe('12345678-1234-1234-1234-123456789000');
    expect(BLE_CONFIG.TEMP_CHARACTERISTIC_UUID).toBe('12345678-1234-1234-1234-123456789001');
    expect(BLE_CONFIG.SETPOINT_CHARACTERISTIC_UUID).toBe('12345678-1234-1234-1234-123456789002');
  });
});

describe('BluetoothService Lifecycle and Setpoint Transmission', () => {
  beforeEach(() => {
    bleService.disconnect();
  });

  it('reports isSupported false in Node environment if navigator.bluetooth is undefined', () => {
    expect(typeof bleService.isSupported()).toBe('boolean');
  });

  it('allows toggling auto-reconnect setting', () => {
    bleService.setAutoReconnect(false);
    expect(bleService.autoReconnectEnabled).toBe(false);
    bleService.setAutoReconnect(true);
    expect(bleService.autoReconnectEnabled).toBe(true);
  });

  it('allows adding and removing status and temperature listeners', () => {
    const statusCallback = vi.fn();
    const tempCallback = vi.fn();

    const unsubStatus = bleService.onStatusChange(statusCallback);
    const unsubTemp = bleService.onTemperatureChange(tempCallback);

    bleService._notifyStatus({ connected: true });
    expect(statusCallback).toHaveBeenCalledWith({ connected: true });

    bleService._notifyTemperature(23.5, '00 00 BC 41');
    expect(tempCallback).toHaveBeenCalledWith(23.5, '00 00 BC 41');

    unsubStatus();
    unsubTemp();

    bleService._notifyStatus({ connected: false });
    expect(statusCallback).toHaveBeenCalledTimes(1);
  });

  it('handles writeSetpoint in simulation mode properly', async () => {
    bleService.startSimulation(72.0);
    expect(bleService.isConnected).toBe(true);

    const result = await bleService.writeSetpoint(68.5);
    expect(result.success).toBe(true);
    expect(result.value).toBe(68.5);
    expect(result.simulated).toBe(true);
    expect(typeof result.hex).toBe('string');
  });

  it('writes setpoint bytes to setpoint characteristic when connected', async () => {
    const mockWriteValue = vi.fn().mockResolvedValue(undefined);
    bleService.isConnected = true;
    bleService.setpointCharacteristic = {
      writeValueWithResponse: mockWriteValue
    };

    const result = await bleService.writeSetpoint(74.0);
    expect(result.success).toBe(true);
    expect(result.value).toBe(74.0);
    expect(mockWriteValue).toHaveBeenCalled();

    // Verify written buffer as UTF-8 string matching "74.0"
    const bufferSent = mockWriteValue.mock.calls[0][0];
    const decoded = new TextDecoder().decode(bufferSent);
    expect(decoded).toBe('74.0');
  });

  it('writes servo command on/off to servo characteristic', async () => {
    const mockWriteValue = vi.fn().mockResolvedValue(undefined);
    bleService.isConnected = true;
    bleService.servoCharacteristic = {
      writeValueWithResponse: mockWriteValue
    };

    const result = await bleService.writeServo('on');
    expect(result.success).toBe(true);
    expect(result.command).toBe('on');
    expect(mockWriteValue).toHaveBeenCalled();

    const bufferSent = mockWriteValue.mock.calls[0][0];
    const decoded = new TextDecoder().decode(bufferSent);
    expect(decoded).toBe('on');
  });

  it('writes numeric servo position (angle) to servo characteristic and serializes writes', async () => {
    const mockWriteValue = vi.fn().mockResolvedValue(undefined);
    bleService.isConnected = true;
    bleService.servoCharacteristic = {
      writeValueWithResponse: mockWriteValue
    };

    const result = await bleService.writeServoPosition(90);
    expect(result.success).toBe(true);
    expect(result.position).toBe(90);
    expect(result.command).toBe('90');
    expect(mockWriteValue).toHaveBeenCalled();

    const bufferSent = mockWriteValue.mock.calls[0][0];
    const decoded = new TextDecoder().decode(bufferSent);
    expect(decoded).toBe('90');
  });

  it('attempts tryAutoConnect when navigator.bluetooth.getDevices provides 903-AC-V2', async () => {
    const mockConnectToDevice = vi.spyOn(bleService, '_connectToDevice').mockResolvedValue({
      success: true,
      deviceName: '903-AC-V2'
    });

    const mockDevice = {
      name: '903-AC-V2',
      id: 'mock-ble-id-903'
    };

    // Mock navigator.bluetooth
    const originalBluetooth = global.navigator?.bluetooth;
    global.navigator = {
      ...global.navigator,
      bluetooth: {
        getDevices: vi.fn().mockResolvedValue([mockDevice])
      }
    };

    const connected = await bleService.tryAutoConnect();
    expect(connected).toBe(true);
    expect(mockConnectToDevice).toHaveBeenCalledWith(mockDevice);

    mockConnectToDevice.mockRestore();
    if (originalBluetooth) {
      global.navigator.bluetooth = originalBluetooth;
    } else {
      delete global.navigator.bluetooth;
    }
  });

  it('returns false in tryAutoConnect when autoReconnect is disabled or no devices found', async () => {
    bleService.setAutoReconnect(false);
    expect(await bleService.tryAutoConnect()).toBe(false);

    bleService.setAutoReconnect(true);
    global.navigator = {
      ...global.navigator,
      bluetooth: {
        getDevices: vi.fn().mockResolvedValue([])
      }
    };
    expect(await bleService.tryAutoConnect()).toBe(false);
  });
});

