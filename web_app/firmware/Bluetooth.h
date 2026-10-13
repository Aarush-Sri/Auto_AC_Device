#ifndef Bluetooth_H
#define Bluetooth_H

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Arduino.h>

#define SERVICE_UUID            "12345678-1234-1234-1234-123456789000"
#define TEMP_UUID               "12345678-1234-1234-1234-123456789001"
#define NEW_TEMP_UUID           "12345678-1234-1234-1234-123456789002"
#define SERVO_UUID              "12345678-1234-1234-1234-123456789003"

BLECharacteristic *tempCharacteristic;
BLECharacteristic *getNewTempCharacteristic;
BLECharacteristic *servoCharacteristic;

float newT = -1;
String servoCommand = "off";

class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        Serial.println("========================================");
        Serial.println(">>> ESP32: WEB BROWSER CONNECTED! <<<");
        Serial.println("========================================");
    }

    void onDisconnect(BLEServer* pServer) {
        Serial.println(">>> ESP32: DISCONNECTED! Restarting advertising... <<<");
        BLEDevice::startAdvertising();
    }
};

class GetTempCallBack : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *y) {
        std::string val = y->getValue();
        Serial.println("========================================");
        Serial.print(">>> GGGGGOT new temp: ");
        Serial.println(val.c_str());

        newT = atof(val.c_str());
        Serial.print(">>> Parsed float: ");
        Serial.println(newT);
        Serial.println("========================================");
    }
};

class ServoCallBack : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *y) {
        std::string val = y->getValue();
        servoCommand = val.c_str();
        Serial.println("========================================");
        Serial.print(">>> SERVO STATUS / POSITION RECEIVED: ");
        Serial.println(servoCommand);
        float pos = atof(servoCommand.c_str());
        Serial.print(">>> Parsed Servo Position (float): ");
        Serial.println(pos);
        Serial.println("========================================");
    }
};

class Bluetooth {

    public:

        void init() {
            BLEDevice::init("903-AC-V2");

            BLEServer *server = BLEDevice::createServer();
            server->setCallbacks(new ServerCallbacks());

            BLEService *service = server->createService(SERVICE_UUID);

            // 1. Current temp data (UUID ...0001)
            tempCharacteristic = service->createCharacteristic(
                TEMP_UUID,
                BLECharacteristic::PROPERTY_READ
            );

            // 2. Target temp data from +/- or dial (UUID ...0002)
            getNewTempCharacteristic = service->createCharacteristic(
                NEW_TEMP_UUID,
                BLECharacteristic::PROPERTY_READ |
                BLECharacteristic::PROPERTY_WRITE |
                BLECharacteristic::PROPERTY_WRITE_NR  
            );
            getNewTempCharacteristic->setCallbacks(new GetTempCallBack());

            // 3. Servo Position & Power command (UUID ...0003)
            servoCharacteristic = service->createCharacteristic(
                SERVO_UUID,
                BLECharacteristic::PROPERTY_READ |
                BLECharacteristic::PROPERTY_WRITE |
                BLECharacteristic::PROPERTY_WRITE_NR
            );
            servoCharacteristic->setCallbacks(new ServoCallBack());

            // Start service AFTER creating all characteristics
            service->start();

            BLEAdvertising *advertising = BLEDevice::getAdvertising();
            advertising->addServiceUUID(SERVICE_UUID);
            BLEDevice::startAdvertising();

            Serial.println(">>> ESP32 Ready! Advertising as '903-AC-V2' <<<");
        }

        void bluetoothTemp(float t) {
            tempCharacteristic->setValue(t);
        }
        
        float getNewBluetoothTemp() {
            return newT;
        }

        String getServoCommand() {
            return servoCommand;
        }

        String getOnOff() {
            return servoCommand;
        }

        float getServoPosition() {
            return atof(servoCommand.c_str());
        }
};

#endif
