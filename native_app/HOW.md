# Aura Climate — Flutter Native App (iOS, Android, Windows)

Cross-platform native mobile and desktop application for the ESP32 **903-AC-V2** climate control system. Built with Flutter and **`universal_ble`** for direct Bluetooth Low Energy (BLE) control across iOS, Android, and Windows with zero web browser sandboxing constraints.

---

## 📡 Hardware & BLE Architecture

The app communicates directly with the ESP32 peripheral over GATT:

| Parameter | UUID / Value | Direction | Format |
|---|---|---|---|
| **Advertised Name** | `903-AC-V2` / `903-AC` | Peripheral | UTF-8 String |
| **Primary Service** | `12345678-1234-1234-1234-123456789000` | GATT Service | 128-bit UUID |
| **Ambient Temp** | `12345678-1234-1234-1234-123456789001` | Read / Notify | IEEE-754 32-bit Float (LE) or ASCII String (`"24.5"`) |
| **Target Setpoint** | `12345678-1234-1234-1234-123456789002` | Write | UTF-8 String (`"72.0"`) |
| **Servo Position** | `12345678-1234-1234-1234-123456789003` | Write | UTF-8 String (`"on"`, `"off"`, `"90"`) |

---

## 📱 iPhone Installation Guide (Without a Mac)

Because Apple requires every iOS app to be cryptographically signed, follow this tested 4-step workflow to compile in the cloud and install the app from your Windows PC using a free personal Apple ID:

### Step 1: Cloud Compilation (GitHub Actions)
1. Push your repository to GitHub.
2. In your GitHub repository, click **Actions → Build Native Apps (iOS, Android, Windows)**.
3. Click **Run workflow**. GitHub's macOS cloud runner will build the app and publish an artifact called **`AuraClimate-iOS-IPA`**.
4. Download the artifact and extract `AuraClimate.ipa` onto your Windows PC.

### Step 2: Install Sideloadly on Windows
1. Download **[Sideloadly (Windows 64-bit)](https://sideloadly.io/)**.
2. Install standard **iTunes for Windows** and **iCloud for Windows** (install the standalone Apple setup, not the Microsoft Store version, so USB drivers are available).
3. Connect your iPhone to your Windows PC with a USB cable.
4. Unlock your iPhone and tap **"Trust This Computer"** when prompted.

### Step 3: Sign & Sideload the IPA
1. Open **Sideloadly**.
2. Your iPhone will appear in the **iDevice** dropdown.
3. Drag `AuraClimate.ipa` into Sideloadly.
4. Enter your personal **Apple ID** email address.
5. Click **Start**. Sideloadly contacts Apple to generate a free developer provisioning profile, signs the app, and installs it onto your iPhone.

### Step 4: One-Time Device Authorization
1. **Enable Developer Mode** (iOS 16, 17, 18):
   - Open iPhone **Settings → Privacy & Security → Developer Mode**.
   - Toggle **Developer Mode: ON** and tap **Restart**.
   - After restart, unlock the phone and tap **Turn On**.
2. **Trust Developer Certificate**:
   - Open iPhone **Settings → General → VPN & Device Management**.
   - Under *Developer App*, tap your Apple ID email.
   - Tap **Trust "[Your Apple ID]"** and confirm.
3. **Launch Aura Climate**:
   - Open the app from your home screen.
   - Tap **"Allow"** when iOS asks for Bluetooth permission.
   - The app immediately links to your ESP32 `903-AC-V2`!

---

## 💻 Local Windows & Android Development

To develop and test on your Windows computer or an Android phone:

```powershell
# 1. Install Flutter on Windows (via winget)
winget install Google.Flutter

# 2. Verify environment
flutter doctor

# 3. Run on Windows Desktop
cd dashboard/native_app
flutter run -d windows

# 4. Run on Android Device
flutter run -d android
```

---

## 🧪 Automated Testing

Run the Dart unit test suite:
```bash
flutter test
```
Tests verify:
- IEEE-754 Little-Endian float32 byte parsing (`[0x00, 0x00, 0xC4, 0x41]` -> 24.5°).
- ASCII string fallbacks (`"24.5"` -> 24.5°).
- Write serialization queues preventing GATT operation collisions.
- Temperature boundary limits (60°F to 85°F) and servo clamping (0° to 180°).
