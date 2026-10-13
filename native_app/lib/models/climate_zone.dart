class ClimateZone {
  final String id;
  final String name;
  final String subtitle;
  final double temp;
  final double setpoint;
  final int humidity;
  final bool power;
  final String mode; // 'cool' | 'heat' | 'eco' | 'fan'
  final String fanSpeed; // 'auto' | 'low' | 'med' | 'high'
  final int aqi;
  final int powerDraw; // Watts

  const ClimateZone({
    required this.id,
    required this.name,
    required this.subtitle,
    required this.temp,
    required this.setpoint,
    required this.humidity,
    required this.power,
    required this.mode,
    required this.fanSpeed,
    required this.aqi,
    required this.powerDraw,
  });

  ClimateZone copyWith({
    String? id,
    String? name,
    String? subtitle,
    double? temp,
    double? setpoint,
    int? humidity,
    bool? power,
    String? mode,
    String? fanSpeed,
    int? aqi,
    int? powerDraw,
  }) {
    return ClimateZone(
      id: id ?? this.id,
      name: name ?? this.name,
      subtitle: subtitle ?? this.subtitle,
      temp: temp ?? this.temp,
      setpoint: setpoint ?? this.setpoint,
      humidity: humidity ?? this.humidity,
      power: power ?? this.power,
      mode: mode ?? this.mode,
      fanSpeed: fanSpeed ?? this.fanSpeed,
      aqi: aqi ?? this.aqi,
      powerDraw: powerDraw ?? this.powerDraw,
    );
  }
}
