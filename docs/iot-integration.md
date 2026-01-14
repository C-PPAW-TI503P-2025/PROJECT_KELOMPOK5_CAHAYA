# ESP32/ESP8266 IoT Device Integration Guide

This guide explains how to integrate ESP32 or ESP8266 microcontrollers with the Smart Street Light System.

## Hardware Requirements

- ESP32 or ESP8266 development board
- LDR (Light Dependent Resistor) sensor
- 10kΩ resistor
- Relay module (5V)
- Jumper wires
- Breadboard (for prototyping)
- Street lamp or LED for testing

## Circuit Diagram

### LDR Sensor Connection
```
ESP32/ESP8266          LDR Circuit
-----------------      ------------------
3.3V ----------------> LDR (one end)
                       LDR (other end) --> A0 (Analog Pin)
GND -----------------> 10kΩ Resistor --> A0
```

### Relay Module Connection
```
ESP32/ESP8266          Relay Module
-----------------      ------------------
GPIO (D5) -----------> IN (Signal)
5V ------------------> VCC
GND -----------------> GND

Relay Output           Street Lamp
-----------------      ------------------
COM -----------------> AC Live
NO ------------------> Lamp Live
```

## Software Setup

### 1. Install Arduino IDE

Download and install Arduino IDE from: https://www.arduino.cc/en/software

### 2. Install ESP Board Support

For ESP8266:
1. Go to File → Preferences
2. Add to "Additional Board Manager URLs":
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. Go to Tools → Board → Boards Manager
4. Search for "esp8266" and install

For ESP32:
1. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Install "ESP32" from Boards Manager

### 3. Install Required Libraries

Install these libraries via Library Manager (Sketch → Include Library → Manage Libraries):
- **ESP8266WiFi** (for ESP8266) or **WiFi** (for ESP32)
- **ESP8266HTTPClient** (for ESP8266) or **HTTPClient** (for ESP32)
- **ArduinoJson** (for JSON parsing)

## Arduino Code

### Complete ESP8266 Example

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* serverUrl = "http://192.168.1.100:3000";  // Change to your server IP

// Device Configuration
const char* deviceId = "LAMP_001";  // Unique device ID

// Pin Configuration
const int ldrPin = A0;      // LDR sensor on analog pin
const int relayPin = D5;    // Relay control pin
const int ledPin = D4;      // Built-in LED for status

// Variables
int lightIntensity = 0;
String currentStatus = "OFF";
String currentMode = "AUTO";
unsigned long lastUpdate = 0;
const unsigned long updateInterval = 5000;  // 5 seconds

void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Pin setup
  pinMode(relayPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  digitalWrite(relayPin, LOW);  // Lamp OFF initially
  
  // Connect to WiFi
  Serial.println("\n\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(ledPin, !digitalRead(ledPin));  // Blink LED
  }
  
  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  digitalWrite(ledPin, HIGH);  // LED ON when connected
  
  // Register device with server
  registerDevice();
}

void loop() {
  // Read sensor every interval
  if (millis() - lastUpdate >= updateInterval) {
    lastUpdate = millis();
    
    // Read LDR sensor
    lightIntensity = analogRead(ldrPin);
    Serial.print("Light Intensity: ");
    Serial.println(lightIntensity);
    
    // Send data to server and get response
    sendSensorData();
    
    // Send heartbeat
    sendHeartbeat();
  }
}

void registerDevice() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient client;
    
    String url = String(serverUrl) + "/api/devices";
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["device_id"] = deviceId;
    doc["device_name"] = "Street Lamp 1";
    doc["location"] = "Main Street - North";
    
    String payload;
    serializeJson(doc, payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Device registration response:");
      Serial.println(response);
    } else {
      Serial.print("Registration failed, error: ");
      Serial.println(http.errorToString(httpCode));
    }
    
    http.end();
  }
}

void sendSensorData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient client;
    
    String url = String(serverUrl) + "/api/sensors/data";
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["device_id"] = deviceId;
    doc["light_intensity"] = lightIntensity;
    
    String payload;
    serializeJson(doc, payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Server response:");
      Serial.println(response);
      
      // Parse response
      StaticJsonDocument<300> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, response);
      
      if (!error) {
        if (responseDoc["success"] == true) {
          // Check if server sent auto action
          if (responseDoc.containsKey("auto_action")) {
            String action = responseDoc["auto_action"].as<String>();
            if (action == "ON") {
              turnLampOn();
            } else if (action == "OFF") {
              turnLampOff();
            }
          }
          
          // Update current status from server
          if (responseDoc.containsKey("current_status")) {
            String status = responseDoc["current_status"].as<String>();
            if (status == "ON" && currentStatus != "ON") {
              turnLampOn();
            } else if (status == "OFF" && currentStatus != "OFF") {
              turnLampOff();
            }
          }
        }
      }
    } else {
      Serial.print("HTTP POST failed, error: ");
      Serial.println(http.errorToString(httpCode));
    }
    
    http.end();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient client;
    
    String url = String(serverUrl) + "/api/devices/" + String(deviceId) + "/heartbeat";
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST("{}");
    http.end();
  }
}

void turnLampOn() {
  digitalWrite(relayPin, HIGH);
  currentStatus = "ON";
  Serial.println("💡 Lamp turned ON");
}

void turnLampOff() {
  digitalWrite(relayPin, LOW);
  currentStatus = "OFF";
  Serial.println("🌙 Lamp turned OFF");
}
```

### ESP32 Version

For ESP32, change these includes:
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
```

And use `WiFi.h` instead of `ESP8266WiFi.h`.

## API Endpoints for IoT Devices

### 1. Register Device
```http
POST /api/devices
Content-Type: application/json

{
  "device_id": "LAMP_001",
  "device_name": "Street Lamp 1",
  "location": "Main Street - North"
}
```

### 2. Send Sensor Data
```http
POST /api/sensors/data
Content-Type: application/json

{
  "device_id": "LAMP_001",
  "light_intensity": 250
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor data received",
  "auto_action": "ON",
  "current_status": "ON"
}
```

### 3. Send Heartbeat
```http
POST /api/devices/LAMP_001/heartbeat
Content-Type: application/json

{}
```

## Configuration

### WiFi Settings
Update in the Arduino code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### Server URL
Find your computer's IP address:
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

Update in the code:
```cpp
const char* serverUrl = "http://192.168.1.100:3000";
```

### Device ID
Each device must have a unique ID:
```cpp
const char* deviceId = "LAMP_001";  // Change for each device
```

## Testing

### 1. Test LDR Sensor
Upload this simple test code:
```cpp
void setup() {
  Serial.begin(115200);
}

void loop() {
  int value = analogRead(A0);
  Serial.print("LDR Value: ");
  Serial.println(value);
  delay(1000);
}
```

Cover the LDR with your hand - value should decrease.

### 2. Test Relay
```cpp
void setup() {
  pinMode(D5, OUTPUT);
}

void loop() {
  digitalWrite(D5, HIGH);
  delay(2000);
  digitalWrite(D5, LOW);
  delay(2000);
}
```

You should hear the relay clicking.

### 3. Test Full System
1. Ensure server is running
2. Upload the complete code
3. Open Serial Monitor (115200 baud)
4. Watch for WiFi connection and data transmission
5. Check dashboard for device status

## Troubleshooting

### WiFi Connection Issues
- Verify SSID and password
- Check WiFi signal strength
- Ensure 2.4GHz network (ESP8266 doesn't support 5GHz)

### Server Connection Issues
- Verify server IP address
- Check if server is running (`http://SERVER_IP:3000/api/health`)
- Ensure devices are on same network
- Check firewall settings

### Sensor Not Working
- Check wiring connections
- Verify LDR orientation
- Test with multimeter
- Check analog pin number

### Relay Not Switching
- Verify relay module voltage (5V)
- Check relay signal pin connection
- Test relay independently
- Ensure sufficient power supply

## Advanced Features

### MQTT Support (Future)
For real-time bidirectional communication, MQTT can be implemented:
```cpp
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient mqtt(espClient);

// Subscribe to control topic
mqtt.subscribe("streetlight/LAMP_001/control");
```

### OTA Updates
Enable Over-The-Air firmware updates:
```cpp
#include <ArduinoOTA.h>

void setup() {
  ArduinoOTA.begin();
}

void loop() {
  ArduinoOTA.handle();
}
```

## Safety Considerations

⚠️ **Important Safety Notes:**

1. **High Voltage**: When connecting to AC mains, ensure proper insulation
2. **Relay Rating**: Use relay rated for your lamp's voltage and current
3. **Enclosure**: Use weatherproof enclosure for outdoor installation
4. **Grounding**: Properly ground all metal parts
5. **Fuse**: Add appropriate fuse for protection
6. **Testing**: Test thoroughly with low voltage before connecting to mains

## Support

For issues:
1. Check Serial Monitor for error messages
2. Verify all connections
3. Test each component individually
4. Check server logs for API errors

---

**Note**: This is an academic project. For production deployment, additional safety measures and certifications are required.
