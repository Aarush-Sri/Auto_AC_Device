/**
 * Web Bluetooth Service for ESP32 903-AC Thermostat
 * Service UUID: 12345678-1234-1234-1234-123456789000
 * Characteristic UUID: 12345678-1234-1234-1234-123456789001
 */

export const BLE_CONFIG = {
  DEVICE_NAME: '903-AC-V2',
  SERVICE_UUID: '12345678-1234-1234-1234-123456789000',
  TEMP_CHARACTERISTIC_UUID: '12345678-1234-1234-1234-123456789001',
  SETPOINT_CHARACTERISTIC_UUID: '12345678-1234-1234-1234-123456789002',
  SERVO_CHARACTERISTIC_UUID: '12345678-1234-1234-1234-123456789003',
};

/**
 * Parses raw DataView from ESP32 BLE Characteristic into a numeric float.
 * Handles IEEE-754 32-bit float (4 bytes, little-endian), 64-bit float, and ASCII string fallback.
 * @param {DataView} dataView 
 * @returns {number|null}
 */
export function parseTemperatureData(dataView) {
  if (!dataView || dataView.byteLength === 0) return null;

  // 1. Check if payload is ASCII numeric string (e.g. "24.5" or "72.4")
  try {
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    const isPrintableAscii = bytes.every(
      (b) => (b >= 0x30 && b <= 0x39) || b === 0x2e || b === 0x2d || b === 0x2b || b === 0x20
    );
    if (isPrintableAscii && bytes.length > 0) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(bytes).trim();
      if (/^[+-]?\d+(\.\d+)?$/.test(text)) {
        const parsed = parseFloat(text);
        if (!Number.isNaN(parsed) && parsed > -50 && parsed < 300) {
          return Math.round(parsed * 10) / 10;
        }
      }
    }
  } catch {
    // continue to binary parsing
  }

  // 2. Binary Float32 (ESP32 setValue(float) writes 4 raw IEEE-754 bytes)
  if (dataView.byteLength === 4) {
    const floatVal = dataView.getFloat32(0, true); // little-endian
    if (!Number.isNaN(floatVal) && floatVal > -50 && floatVal < 300) {
      return Math.round(floatVal * 10) / 10;
    }
  }

  // 3. Binary Float64 (8 bytes fallback)
  if (dataView.byteLength === 8) {
    const doubleVal = dataView.getFloat64(0, true);
    if (!Number.isNaN(doubleVal) && doubleVal > -50 && doubleVal < 300) {
      return Math.round(doubleVal * 10) / 10;
    }
  }

  // 4. Single / Two-byte integer fallback (e.g. 1 byte uint8 or 2 byte int16)
  if (dataView.byteLength === 1) {
    return dataView.getUint8(0);
  }
  if (dataView.byteLength === 2) {
    return dataView.getInt16(0, true) / 10.0;
  }

  return null;
}

class BluetoothService {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.tempCharacteristic = null;
    this.setpointCharacteristic = null;
    this.servoCharacteristic = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.pollTimer = null;
    this.reconnectTimer = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.isAutoReconnecting = false;
    this.autoReconnectEnabled = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.lastValue = null;
    this.rawBytesHex = '';
    this.simTimer = null;
    this.isSimulating = false;
    this._isWritingSetpoint = false;
    this._pendingSetpoint = null;
    this._isWritingServo = false;
    this._pendingServo = null;
    this._userExplicitlyDisconnected = false;
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  isGetDevicesSupported() {
    return this.isSupported() && typeof navigator.bluetooth.getDevices === 'function';
  }

  setAutoReconnect(enabled) {
    this.autoReconnectEnabled = !!enabled;
    if (!enabled && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.isAutoReconnecting = false;
    }
  }

  onTemperatureChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  _notifyStatus(status) {
    this.statusListeners.forEach((cb) => cb(status));
  }

  _notifyTemperature(temp, rawHex) {
    this.lastValue = temp;
    this.rawBytesHex = rawHex;
    this.listeners.forEach((cb) => cb(temp, rawHex));
  }

  _handleCharacteristicValueChanged = (event) => {
    const value = event.target.value;
    const hex = Array.from(new Uint8Array(value.buffer))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    const parsedTemp = parseTemperatureData(value);
    console.log('[BLE] Characteristic value changed:', { hex, parsedTemp });
    if (parsedTemp !== null) {
      this._notifyTemperature(parsedTemp, hex);
    }
  };

  _handleDisconnected = () => {
    console.warn('[BLE] Device disconnected');
    this.isConnected = false;
    this.isConnecting = false;
    this._stopPolling();

    this._notifyStatus({
      connected: false,
      connecting: false,
      isAutoReconnecting: this.autoReconnectEnabled && !this._userExplicitlyDisconnected,
      deviceName: null,
      error: 'Device disconnected',
    });

    if (this.autoReconnectEnabled && !this._userExplicitlyDisconnected && this.device) {
      this._scheduleReconnect();
    }
  };

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[BLE] Max reconnect attempts reached');
      this.isAutoReconnecting = false;
      this._notifyStatus({
        connected: false,
        connecting: false,
        isAutoReconnecting: false,
        error: 'Reconnection timed out. Click Connect to retry.',
      });
      return;
    }

    this.reconnectAttempts += 1;
    this.isAutoReconnecting = true;
    const delay = Math.min(2000 * Math.pow(1.3, this.reconnectAttempts - 1), 10000);
    console.log(`[BLE] Scheduling auto-reconnect attempt #${this.reconnectAttempts} in ${Math.round(delay)}ms...`);

    this._notifyStatus({
      connected: false,
      connecting: true,
      isAutoReconnecting: true,
      error: `Auto-reconnecting to ${BLE_CONFIG.DEVICE_NAME} (attempt ${this.reconnectAttempts})...`,
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (!this.device || this._userExplicitlyDisconnected) return;
        console.log('[BLE] Executing auto-reconnect...');
        await this._connectToDevice(this.device);
        this.reconnectAttempts = 0;
        this.isAutoReconnecting = false;
      } catch (err) {
        console.warn('[BLE] Auto-reconnect attempt failed:', err);
        if (this.autoReconnectEnabled && !this._userExplicitlyDisconnected) {
          this._scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Tries to automatically connect to a previously authorized "903-AC-V2" or "903-AC" device
   * using the Web Bluetooth persistent permissions API (`navigator.bluetooth.getDevices()`).
   * Runs without prompting user with a modal if permissions were previously granted.
   */
  async tryAutoConnect() {
    if (!this.isSupported() || !this.autoReconnectEnabled || this.isConnected || this.isConnecting) {
      return false;
    }

    if (typeof navigator.bluetooth.getDevices !== 'function') {
      console.log('[BLE] navigator.bluetooth.getDevices is not supported in this browser environment');
      return false;
    }

    try {
      console.log('[BLE] Checking previously permitted Bluetooth devices for auto-connect...');
      const devices = await navigator.bluetooth.getDevices();
      console.log('[BLE] Permitted devices count:', devices.length);

      if (!devices || devices.length === 0) {
        console.log('[BLE] No previously permitted Bluetooth devices found on this origin.');
        return false;
      }

      let savedId = null;
      try {
        if (typeof localStorage !== 'undefined') {
          savedId = localStorage.getItem('aura_ble_last_device_id');
        }
      } catch {
        // ignore
      }

      // Prioritize saved device ID, then name match, then first permitted device
      const targetDevice = (savedId ? devices.find(d => d.id === savedId) : null) ||
        devices.find(d => {
          const name = (d.name || '').toUpperCase();
          return name === '903-AC-V2' || name.startsWith('903-AC') || name.startsWith('903');
        }) || devices[0];

      if (!targetDevice) {
        return false;
      }

      console.log(`[BLE] Found previously permitted device "${targetDevice.name || targetDevice.id}". Auto-connecting...`);
      this._userExplicitlyDisconnected = false;

      this._notifyStatus({
        connected: false,
        connecting: true,
        isAutoReconnecting: true,
        error: `Auto-connecting to ${targetDevice.name || BLE_CONFIG.DEVICE_NAME}...`,
      });

      // 1. Try direct GATT connection
      try {
        await this._connectToDevice(targetDevice);
        return true;
      } catch (directErr) {
        console.warn('[BLE] Direct GATT auto-connect failed, trying advertisement watcher / scheduling reconnect...', directErr);
      }

      // 2. Try Web Bluetooth watchAdvertisements API if available in browser
      if (typeof targetDevice.watchAdvertisements === 'function') {
        try {
          const abortController = new AbortController();
          const onAdv = async (event) => {
            console.log('[BLE] Advertisement received from device:', event.device.name || event.device.id);
            try {
              abortController.abort();
            } catch {
              // ignore
            }
            if (!this.isConnected && !this._userExplicitlyDisconnected) {
              try {
                await this._connectToDevice(targetDevice);
              } catch (e) {
                console.warn('[BLE] Connect on advertisement failed:', e);
              }
            }
          };
          targetDevice.addEventListener('advertisementreceived', onAdv, { once: true });
          await targetDevice.watchAdvertisements({ signal: abortController.signal });
          console.log('[BLE] Watching advertisements for auto-connect...');
        } catch (advErr) {
          console.warn('[BLE] watchAdvertisements call failed:', advErr);
        }
      }

      // 3. If not yet connected, schedule background reconnect retry
      if (!this.isConnected && this.autoReconnectEnabled && !this._userExplicitlyDisconnected) {
        this.device = targetDevice;
        this._scheduleReconnect();
      }
    } catch (err) {
      console.warn('[BLE] Auto-connect from getDevices failed:', err);
    }
    return false;
  }

  async _connectToDevice(device) {
    this.device = device;
    this.isConnecting = true;
    this._userExplicitlyDisconnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      if (typeof localStorage !== 'undefined' && device.id) {
        localStorage.setItem('aura_ble_last_device_id', device.id);
        if (device.name) {
          localStorage.setItem('aura_ble_last_device_name', device.name);
        }
      }
    } catch {
      // ignore
    }

    this._notifyStatus({ connected: false, connecting: true, error: null });

    const targetServiceUuid = BLE_CONFIG.SERVICE_UUID.toLowerCase();
    this.device.removeEventListener('gattserverdisconnected', this._handleDisconnected);
    this.device.addEventListener('gattserverdisconnected', this._handleDisconnected);

    console.log('[BLE] Connecting to GATT server for device:', this.device.name || BLE_CONFIG.DEVICE_NAME);
    this.server = await this.device.gatt.connect();
    console.log('[BLE] GATT Server connected.');

    // Discover Primary Service
    console.log('[BLE] Searching for primary service:', targetServiceUuid);
    try {
      this.service = await this.server.getPrimaryService(targetServiceUuid);
    } catch (svcErr) {
      console.warn('[BLE] Direct getPrimaryService failed, querying all primary services...', svcErr);
      const services = await this.server.getPrimaryServices();
      this.service = services.find(s => s.uuid.toLowerCase() === targetServiceUuid) || services[0];
    }

    if (!this.service) {
      throw new Error(`Service ${BLE_CONFIG.SERVICE_UUID} not found on ${this.device.name}.`);
    }

    // Discover All Characteristics in Service
    const chars = await this.service.getCharacteristics();
    console.log('[BLE] Discovered characteristics in service:', chars.map(c => c.uuid));

    if (chars.length === 0) {
      throw new Error('No characteristics found in ESP32 service! Ensure service->start() is called AFTER createCharacteristic() in Arduino.');
    }

    // 1. Temp Characteristic (UUID ...0001)
    this.tempCharacteristic = chars.find(
      c => c.uuid.toLowerCase() === BLE_CONFIG.TEMP_CHARACTERISTIC_UUID.toLowerCase() || c.uuid.toLowerCase().includes('9001')
    ) || chars[0];

    // 2. Setpoint Characteristic (UUID ...0002)
    this.setpointCharacteristic = chars.find(
      c => c.uuid.toLowerCase() === BLE_CONFIG.SETPOINT_CHARACTERISTIC_UUID.toLowerCase() || c.uuid.toLowerCase().includes('9002')
    ) || (chars.length > 1 ? chars[1] : null);

    // 3. Servo Characteristic (UUID ...0003)
    this.servoCharacteristic = chars.find(
      c => c.uuid.toLowerCase() === BLE_CONFIG.SERVO_CHARACTERISTIC_UUID.toLowerCase() || c.uuid.toLowerCase().includes('9003')
    ) || (chars.length > 2 ? chars[2] : null);

    console.log('[BLE] Mapped characteristics:', {
      tempUuid: this.tempCharacteristic?.uuid,
      setpointUuid: this.setpointCharacteristic?.uuid,
      servoUuid: this.servoCharacteristic?.uuid
    });

    if (!this.tempCharacteristic) {
      throw new Error(`Characteristic ${BLE_CONFIG.TEMP_CHARACTERISTIC_UUID} not found.`);
    }

    this.isConnected = true;
    this.isConnecting = false;
    this.isAutoReconnecting = false;
    this.reconnectAttempts = 0;

    this._notifyStatus({
      connected: true,
      connecting: false,
      isAutoReconnecting: false,
      deviceName: this.device.name || BLE_CONFIG.DEVICE_NAME,
      error: null,
    });

    // Try subscribing to notifications if supported
    try {
      if (this.tempCharacteristic.properties.notify || this.tempCharacteristic.properties.indicate) {
        console.log('[BLE] Starting characteristic notifications...');
        await this.tempCharacteristic.startNotifications();
        this.tempCharacteristic.removeEventListener(
          'characteristicvaluechanged',
          this._handleCharacteristicValueChanged
        );
        this.tempCharacteristic.addEventListener(
          'characteristicvaluechanged',
          this._handleCharacteristicValueChanged
        );
        console.log('[BLE] Notifications active.');
      } else {
        console.log('[BLE] Characteristic is READ-only. Starting polling loop every 1.5s...');
        this.startPolling(1500);
      }
    } catch (e) {
      console.warn('[BLE] Notifications not available, falling back to polling:', e);
      this.startPolling(1500);
    }

    // Perform immediate initial read
    await this.readTemperature();

    return {
      success: true,
      deviceName: this.device.name || BLE_CONFIG.DEVICE_NAME,
    };
  }

  async connect() {
    if (!this.isSupported()) {
      const err = 'Web Bluetooth is not supported in Safari or Firefox. Please use Chrome/Edge on Desktop or Android, or the Bluefy BLE browser on iPhone/iPad.';
      this._notifyStatus({ connected: false, connecting: false, error: err });
      throw new Error(err);
    }

    try {
      this.isConnecting = true;
      this._userExplicitlyDisconnected = false;
      this._notifyStatus({ connected: false, connecting: true, error: null });

      const targetServiceUuid = BLE_CONFIG.SERVICE_UUID.toLowerCase();
      console.log('[BLE] Requesting Bluetooth device with service:', targetServiceUuid);
      
      let selectedDevice = null;
      try {
        selectedDevice = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            targetServiceUuid,
            '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
            '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
          ]
        });
      } catch (reqErr) {
        console.warn('[BLE] acceptAllDevices failed, trying named filters...', reqErr);
        selectedDevice = await navigator.bluetooth.requestDevice({
          filters: [
            { name: BLE_CONFIG.DEVICE_NAME },
            { name: '903-AC' },
            { namePrefix: '903-AC' },
            { namePrefix: '903' },
            { namePrefix: 'AC' }
          ],
          optionalServices: [
            targetServiceUuid,
            '00001800-0000-1000-8000-00805f9b34fb',
            '00001801-0000-1000-8000-00805f9b34fb'
          ]
        });
      }

      console.log('[BLE] Device selected by user:', selectedDevice.name, selectedDevice.id);
      return await this._connectToDevice(selectedDevice);
    } catch (err) {
      console.error('[BLE] Connect failed:', err);
      this.isConnecting = false;
      this.isConnected = false;
      this._notifyStatus({
        connected: false,
        connecting: false,
        error: err.message || 'Bluetooth connection failed',
      });
      throw err;
    }
  }

  async readTemperature() {
    if (!this.tempCharacteristic) {
      console.warn('[BLE] readTemperature called but tempCharacteristic is null');
      return null;
    }

    try {
      const dataView = await this.tempCharacteristic.readValue();
      const hex = Array.from(new Uint8Array(dataView.buffer))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      const parsedTemp = parseTemperatureData(dataView);
      console.log('[BLE] Read characteristic value:', { hex, parsedTemp, byteLength: dataView.byteLength });
      if (parsedTemp !== null) {
        this._notifyTemperature(parsedTemp, hex);
      }
      return parsedTemp;
    } catch (error) {
      console.error('[BLE] Error reading temperature characteristic:', error);
      return null;
    }
  }

  startPolling(intervalMs = 1500) {
    this._stopPolling();
    this.pollTimer = setInterval(() => {
      if (this.isConnected) {
        this.readTemperature();
      }
    }, intervalMs);
  }

  _stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // Simulation Mode for testing dashboard without hardware
  startSimulation(baseTemp = 24.0) {
    this.stopSimulation();
    this.isSimulating = true;
    this.isConnected = true;
    this._notifyStatus({
      connected: true,
      connecting: false,
      deviceName: '903-AC (Simulated)',
      error: null
    });

    let current = baseTemp;
    // Push stable initial reading immediately
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, current, true);
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    this._notifyTemperature(current, hex);

    // Keep it steady without erratic jitter
    this.simTimer = setInterval(() => {
      if (!this.isConnected) return;
      const buf = new ArrayBuffer(4);
      new DataView(buf).setFloat32(0, current, true);
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      this._notifyTemperature(current, hex);
    }, 2000);
  }

  stopSimulation() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.isSimulating = false;
  }

  /**
   * Writes the user-chosen target setpoint temperature to characteristic UUID ...0002.
   * Sends as UTF-8 string (e.g. "72.0") so Arduino's atof(val.c_str()) parses it directly.
   * Includes write serialization to prevent "GATT operation already in progress" Web Bluetooth errors.
   * @param {number} tempValue 
   * @returns {Promise<{success: boolean, value: number, hex?: string, simulated?: boolean, queued?: boolean}>}
   */
  async writeSetpoint(tempValue) {
    const num = Number(tempValue);
    if (Number.isNaN(num)) {
      throw new Error(`Invalid setpoint temperature: ${tempValue}`);
    }

    if (this.isSimulating) {
      const strVal = num.toFixed(1);
      const encoder = new TextEncoder();
      const buffer = encoder.encode(strVal);
      const hex = Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      console.log(`[BLE Simulated] Setpoint updated to "${strVal}" [${hex}]`);
      return { success: true, value: num, hex, simulated: true };
    }

    if (!this.isConnected) {
      console.warn('[BLE] Cannot write setpoint: Bluetooth is not connected');
      return { success: false, value: num, error: 'Not connected' };
    }

    // If setpointCharacteristic is null, attempt to re-query the service dynamically
    if (!this.setpointCharacteristic && this.service) {
      console.log('[BLE] setpointCharacteristic was null, re-querying GATT characteristics...');
      try {
        const chars = await this.service.getCharacteristics();
        console.log('[BLE] Dynamic characteristic query found:', chars.map(c => c.uuid));
        this.setpointCharacteristic = chars.find(
          c => c.uuid.toLowerCase().includes('9002') || c.uuid.toLowerCase() === BLE_CONFIG.SETPOINT_CHARACTERISTIC_UUID.toLowerCase()
        ) || (chars.length > 1 ? chars[1] : null);
      } catch (e) {
        console.warn('[BLE] Dynamic characteristic re-query failed:', e);
      }
    }

    if (!this.setpointCharacteristic) {
      console.error(
        '[BLE] Cannot write setpoint: Characteristic 12345678-1234-1234-1234-123456789002 not found on device!\n' +
        '-> Fix: In your ESP32 Arduino code, ensure service->start() is called AFTER creating getNewTempCharacteristic, and restart PC Bluetooth to clear GATT cache.'
      );
      return { success: false, value: num, error: 'Characteristic 9002 not found on ESP32' };
    }

    // If a write operation is currently in-flight on the GATT server, queue the latest value
    if (this._isWritingSetpoint) {
      this._pendingSetpoint = num;
      return { success: true, value: num, queued: true };
    }

    this._isWritingSetpoint = true;

    try {
      const strVal = num.toFixed(1);
      const encoder = new TextEncoder();
      const buffer = encoder.encode(strVal);
      const hex = Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      console.log(`[BLE] Writing setpoint "${strVal}" to ${BLE_CONFIG.SETPOINT_CHARACTERISTIC_UUID}: [${hex}]`);

      let writeSuccess = false;
      let lastErr = null;

      if (typeof this.setpointCharacteristic.writeValueWithResponse === 'function') {
        try {
          await this.setpointCharacteristic.writeValueWithResponse(buffer);
          writeSuccess = true;
        } catch (e1) {
          lastErr = e1;
          console.warn('[BLE] writeValueWithResponse failed, trying fallback...', e1);
        }
      }

      if (!writeSuccess && typeof this.setpointCharacteristic.writeValueWithoutResponse === 'function') {
        try {
          await this.setpointCharacteristic.writeValueWithoutResponse(buffer);
          writeSuccess = true;
        } catch (e2) {
          lastErr = e2;
          console.warn('[BLE] writeValueWithoutResponse failed, trying fallback...', e2);
        }
      }

      if (!writeSuccess && typeof this.setpointCharacteristic.writeValue === 'function') {
        try {
          await this.setpointCharacteristic.writeValue(buffer);
          writeSuccess = true;
        } catch (e3) {
          lastErr = e3;
          console.error('[BLE] writeValue fallback failed:', e3);
        }
      }

      if (!writeSuccess && lastErr) {
        throw lastErr;
      }

      return { success: true, value: num, hex };
    } catch (err) {
      console.error('[BLE] Error writing setpoint characteristic:', err);
      throw err;
    } finally {
      this._isWritingSetpoint = false;
      if (this._pendingSetpoint !== null) {
        const nextVal = this._pendingSetpoint;
        this._pendingSetpoint = null;
        this.writeSetpoint(nextVal).catch((e) => console.warn('[BLE] Queued write failed:', e));
      }
    }
  }

  /**
   * Writes command or position to servo characteristic UUID ...0003
   * Sends as UTF-8 string so ESP32's atof(val.c_str()) in getOnOffCallBack parses numeric positions,
   * or handles string commands.
   * @param {string|number} commandOrPosition 
   * @returns {Promise<{success: boolean, command: string, position?: number, hex?: string, simulated?: boolean, queued?: boolean}>}
   */
  async writeServo(commandOrPosition) {
    const cmd = String(commandOrPosition).trim();
    const isNumeric = !Number.isNaN(Number(cmd));
    const numericVal = isNumeric ? Number(cmd) : null;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(cmd);
    const hex = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    console.log(`[BLE] Writing servo value "${cmd}" [${hex}] to ${BLE_CONFIG.SERVO_CHARACTERISTIC_UUID}`);

    if (this.isSimulating) {
      console.log(`[BLE Simulated] Servo value updated to: "${cmd}" [${hex}]`);
      return { success: true, command: cmd, position: numericVal, hex, simulated: true };
    }

    if (!this.isConnected) {
      console.warn('[BLE] Cannot write servo: Bluetooth is not connected');
      return { success: false, command: cmd, position: numericVal, error: 'Not connected' };
    }

    // Dynamic discovery if not yet mapped
    if (!this.servoCharacteristic && this.service) {
      try {
        const chars = await this.service.getCharacteristics();
        this.servoCharacteristic = chars.find(
          c => c.uuid.toLowerCase().includes('9003') || c.uuid.toLowerCase() === BLE_CONFIG.SERVO_CHARACTERISTIC_UUID.toLowerCase()
        ) || null;
      } catch (e) {
        console.warn('[BLE] Dynamic servo characteristic discovery failed:', e);
      }
    }

    if (!this.servoCharacteristic) {
      console.warn('[BLE] Servo characteristic (...0003) not found on device');
      return { success: false, command: cmd, position: numericVal, error: 'Servo characteristic not found' };
    }

    // Queue serialization to prevent GATT collision during rapid clicks
    if (this._isWritingServo) {
      this._pendingServo = commandOrPosition;
      return { success: true, command: cmd, position: numericVal, queued: true };
    }

    this._isWritingServo = true;

    try {
      let writeSuccess = false;
      let lastErr = null;

      if (typeof this.servoCharacteristic.writeValueWithResponse === 'function') {
        try {
          await this.servoCharacteristic.writeValueWithResponse(buffer);
          writeSuccess = true;
        } catch (e1) {
          lastErr = e1;
          console.warn('[BLE] Servo writeValueWithResponse failed, trying fallback...', e1);
        }
      }

      if (!writeSuccess && typeof this.servoCharacteristic.writeValueWithoutResponse === 'function') {
        try {
          await this.servoCharacteristic.writeValueWithoutResponse(buffer);
          writeSuccess = true;
        } catch (e2) {
          lastErr = e2;
          console.warn('[BLE] Servo writeValueWithoutResponse failed, trying fallback...', e2);
        }
      }

      if (!writeSuccess && typeof this.servoCharacteristic.writeValue === 'function') {
        try {
          await this.servoCharacteristic.writeValue(buffer);
          writeSuccess = true;
        } catch (e3) {
          lastErr = e3;
          console.error('[BLE] Servo writeValue fallback failed:', e3);
        }
      }

      if (!writeSuccess && lastErr) {
        throw lastErr;
      }

      return { success: true, command: cmd, position: numericVal, hex };
    } catch (err) {
      console.error('[BLE] Error writing servo characteristic:', err);
      throw err;
    } finally {
      this._isWritingServo = false;
      if (this._pendingServo !== null) {
        const nextCmd = this._pendingServo;
        this._pendingServo = null;
        this.writeServo(nextCmd).catch((e) => console.warn('[BLE] Queued servo write failed:', e));
      }
    }
  }

  disconnect() {
    this._userExplicitlyDisconnected = true;
    this.isAutoReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopSimulation();
    this._stopPolling();

    if (this.tempCharacteristic) {
      try {
        this.tempCharacteristic.removeEventListener(
          'characteristicvaluechanged',
          this._handleCharacteristicValueChanged
        );
      } catch {
        // ignore
      }
    }

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch {
        // ignore
      }
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.device = null;
    this.server = null;
    this.service = null;
    this.tempCharacteristic = null;
    this.setpointCharacteristic = null;
    this.servoCharacteristic = null;

    this._notifyStatus({
      connected: false,
      connecting: false,
      isAutoReconnecting: false,
      deviceName: null,
      error: null,
    });
  }
}

export const bleService = new BluetoothService();
