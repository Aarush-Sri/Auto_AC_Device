import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import 'package:universal_ble/universal_ble.dart';
import '../constants/aura_theme.dart';
import '../constants/ble_constants.dart';
import '../providers/thermostat_provider.dart';

class BleScannerSheet extends StatefulWidget {
  const BleScannerSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const BleScannerSheet(),
    );
  }

  @override
  State<BleScannerSheet> createState() => _BleScannerSheetState();
}

class _BleScannerSheetState extends State<BleScannerSheet> {
  StreamSubscription<List<BleScanResult>>? _scanSub;
  List<BleScanResult> _devices = [];
  String? _connectingDeviceId;

  @override
  void initState() {
    super.initState();
    final thermostat = context.read<ThermostatProvider>();
    _devices = List.from(thermostat.scannedDevices);

    _scanSub = thermostat.scanResultsStream.listen((devices) {
      if (mounted) {
        setState(() {
          _devices = devices;
        });
      }
    });

    // Start scan on open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!thermostat.bleStatus.isConnected) {
        thermostat.startBleScan();
      }
    });
  }

  @override
  void dispose() {
    _scanSub?.cancel();
    super.dispose();
  }

  bool _isRecommended(BleScanResult device) {
    final name = (device.name ?? '').toUpperCase();
    return name.contains('903') ||
        name.contains('AC') ||
        name.contains('ESP') ||
        name.contains('AURA');
  }

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final bleStatus = thermostat.bleStatus;
    final isScanning = thermostat.isScanning;

    // Sort devices: recommended first, then by RSSI
    final sortedDevices = List<BleScanResult>.from(_devices)
      ..sort((a, b) {
        final aRec = _isRecommended(a) ? 1 : 0;
        final bRec = _isRecommended(b) ? 1 : 0;
        if (aRec != bRec) return bRec.compareTo(aRec);
        return (b.rssi ?? -100).compareTo(a.rssi ?? -100);
      });

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: const BoxDecoration(
        color: AuraTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: AuraTheme.border, width: 1),
          left: BorderSide(color: AuraTheme.border, width: 1),
          right: BorderSide(color: AuraTheme.border, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle bar
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AuraTheme.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.bluetooth, size: 20, color: AuraTheme.primary),
                      SizedBox(width: 8),
                      Text(
                        'Bluetooth Devices',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AuraTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      if (isScanning)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AuraTheme.primary,
                          ),
                        )
                      else
                        IconButton(
                          icon: const Icon(LucideIcons.refresh_cw, size: 18, color: AuraTheme.textSecondary),
                          onPressed: () {
                            thermostat.startBleScan();
                          },
                        ),
                      IconButton(
                        icon: const Icon(LucideIcons.x, size: 20, color: AuraTheme.textSecondary),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(color: AuraTheme.border, height: 1),

            // Connected Device Banner (if already connected)
            if (bleStatus.isConnected) ...[
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AuraTheme.cardSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AuraTheme.primary.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AuraTheme.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Center(
                        child: Icon(LucideIcons.bluetooth_connected, color: AuraTheme.primary, size: 18),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                bleStatus.deviceName ?? BleConstants.deviceName,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AuraTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AuraTheme.success,
                                ),
                              ),
                            ],
                          ),
                          if (bleStatus.deviceId != null)
                            Text(
                              bleStatus.deviceId!,
                              style: const TextStyle(
                                fontSize: 10,
                                fontFamily: 'JetBrains Mono',
                                color: AuraTheme.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        side: const BorderSide(color: AuraTheme.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {
                        thermostat.disconnectBle();
                      },
                      child: const Text('Disconnect', style: TextStyle(fontSize: 12, color: AuraTheme.warning)),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'NEARBY PERIPHERALS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: AuraTheme.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],

            // Device List
            Expanded(
              child: sortedDevices.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              isScanning ? LucideIcons.radio : LucideIcons.bluetooth_off,
                              size: 40,
                              color: AuraTheme.textMuted,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              isScanning
                                  ? 'Searching for 903-AC-V2 nearby...'
                                  : 'No Bluetooth devices discovered',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AuraTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Ensure your ESP32 device is powered on, and Bluetooth & Location are enabled on your phone.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AuraTheme.textMuted),
                            ),
                            const SizedBox(height: 16),
                            if (!isScanning)
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AuraTheme.primary,
                                  foregroundColor: AuraTheme.background,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                icon: const Icon(LucideIcons.scan, size: 16),
                                label: const Text('Start Scan', style: TextStyle(fontWeight: FontWeight.bold)),
                                onPressed: () {
                                  thermostat.startBleScan();
                                },
                              ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: sortedDevices.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, idx) {
                        final device = sortedDevices[idx];
                        final isRec = _isRecommended(device);
                        final name = (device.name != null && device.name!.trim().isNotEmpty)
                            ? device.name!
                            : 'Unnamed BLE Device';
                        final isConnectingThis = _connectingDeviceId == device.deviceId && bleStatus.isConnecting;

                        return InkWell(
                          onTap: isConnectingThis
                              ? null
                              : () async {
                                  setState(() {
                                    _connectingDeviceId = device.deviceId;
                                  });
                                  await thermostat.connectToDevice(device.deviceId, device.name);
                                  if (mounted && thermostat.bleStatus.isConnected) {
                                    Navigator.of(context).pop();
                                  }
                                },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isRec
                                  ? AuraTheme.primary.withOpacity(0.08)
                                  : AuraTheme.cardSurface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isRec
                                    ? AuraTheme.primary.withOpacity(0.4)
                                    : AuraTheme.border,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: isRec
                                        ? AuraTheme.primary.withOpacity(0.18)
                                        : AuraTheme.cardSurfaceElevated,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      isRec ? LucideIcons.cpu : LucideIcons.bluetooth,
                                      size: 18,
                                      color: isRec ? AuraTheme.primary : AuraTheme.textSecondary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              name,
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                                color: isRec ? AuraTheme.primary : AuraTheme.textPrimary,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (isRec) ...[
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AuraTheme.primary.withOpacity(0.15),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: const Text(
                                                'ESP32',
                                                style: TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                  color: AuraTheme.primary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        device.deviceId,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontFamily: 'JetBrains Mono',
                                          color: AuraTheme.textMuted,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                if (device.rssi != null) ...[
                                  Text(
                                    '${device.rssi} dBm',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontFamily: 'JetBrains Mono',
                                      color: AuraTheme.textMuted,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                if (isConnectingThis)
                                  const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AuraTheme.primary,
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: isRec
                                          ? AuraTheme.primary
                                          : AuraTheme.cardSurfaceElevated,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      'Connect',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isRec ? AuraTheme.background : AuraTheme.textPrimary,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
