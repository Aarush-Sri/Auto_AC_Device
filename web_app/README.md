# Aura Climate — Web App

Modern React + Vite web dashboard for the ESP32-based **903-AC-V2** smart climate control system. Integrates direct Web Bluetooth Low Energy (BLE) communication, multi-zone climate control, schedules, energy monitoring, and telemetry logging.

---

## 📡 Web Bluetooth (BLE) Integration & Auto-Connect Guide

### 1. Bluetooth Service Architecture

The web dashboard connects directly from the browser to the ESP32 peripheral over Web Bluetooth GATT without needing an intermediate server.

| Parameter | Identifier / UUID | Purpose | Format |
|---|---|---|---|
| **Device Name** | `903-AC-V2` / `903-AC` | Advertising Peripheral Name | UTF-8 String |
| **Primary Service** | `12345678-1234-1234-1234-123456789000` | Aura AC Service | 128-bit UUID |
| **Ambient Temp Characteristic** | `12345678-1234-1234-1234-123456789001` | Read / Notify current temperature | 4-byte IEEE-754 Float32 (LE) or ASCII string (e.g. `"24.5"`) |
| **Target Setpoint Characteristic** | `12345678-1234-1234-1234-123456789002` | Write target temperature setpoint | UTF-8 String (e.g. `"72.0"`) |
| **System Power Characteristic** | `12345678-1234-1234-1234-123456789003` | Write system power toggle | UTF-8 String (`"on"` / `"off"`) |

---

## 💻 Development & Testing

```bash
# Navigate to web_app directory
cd dashboard/web_app

# Install dependencies
npm install

# Run development server
npm run dev

# Run unit tests
npm test
```
