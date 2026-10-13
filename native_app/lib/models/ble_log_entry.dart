enum BleLogType {
  info,
  success,
  warn,
  error,
  data,
}

class BleLogEntry {
  final String id;
  final String timestamp;
  final String message;
  final BleLogType type;

  BleLogEntry({
    required this.id,
    required this.timestamp,
    required this.message,
    required this.type,
  });
}
