/*
  Vào buổi tối : 0.001 – 0.02 Lux
  Ánh trăng : 0.02 – 0.3 lux
  Trời nhiều mây trong nhà : 5 – 50 lux
  Trời nhiều mây ngoài trời : 50 – 500 lux
  Trời nắng trong nhà : 100 – 1000 lux
  Ánh sáng cần thiết để đọc sách: 50 – 60 lux
*/

#include <Wire.h>  
#include <ESP8266WiFi.h>
#include <BH1750.h>

#include <OneWire.h>
#include <DallasTemperature.h>
#define ONE_WIRE_BUS 14
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature WaterTemp(&oneWire);

#define pHPin A0

#define WIFI_SSID "POCO X3 Pro" 
#define WIFI_PASSWORD "112233445566" // Thay đổi password wifi của bạn

const int channelID = 978866; //
String writeAPIKey = "7BI1NB1Q1R6ICC9O"; // write API key for your ThingSpeak Channel
const char* server = "api.thingspeak.com";

BH1750 lightMeter;
WiFiClient client;

void setup(){
  Serial.begin(9600);
  Serial.println(F("Measurement begin..."));

  // ThingSpeak setup
  WiFi.begin (WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting...");
  Serial.println(WIFI_SSID);  
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println ("WIFI Connected!");
  Serial.println(WiFi.localIP());
  Serial.print("\n");
  
  // BH1750 setup
  Wire.begin();
  lightMeter.begin();

  // DS18B20 setup
  WaterTemp.begin();
  
}

void loop() {

  //BH1750
  float lux = lightMeter.readLightLevel();

  //DS18B20
  WaterTemp.requestTemperatures(); 
  float tempC = WaterTemp.getTempCByIndex(0);
  
  //E-201-C
  int pHReading = analogRead(pHPin);
  float pHvoltage = pHReading*3.3/1023.0;
  float phValue = (6.86 + ((2.71 - pHvoltage)/0.185));
  
  if (client.connect(server, 80)){
    String body = "field1=" + String(lux, 1) + "&field2=" + String(tempC, 1) + "&field3=" + String(phValue, 2);
    
    client.print("POST /update HTTP/1.1\n");
    client.print("Host: api.thingspeak.com\n");
    client.print("Connection: close\n");
    client.print("X-THINGSPEAKAPIKEY: " + writeAPIKey + "\n");
    client.print("Content-Type: application/x-www-form-urlencoded\n");
    client.print("Content-Length: ");
    client.print(body.length());
    client.print("\n\n");
    client.print(body);
    client.print("\n\n");
    
    Serial.print("Light: ");
    Serial.print(lux, 1);
    Serial.print(" lx\n");

    Serial.print("Water temperature: ");
    Serial.print(tempC, 1);
    Serial.print("\n");

    Serial.print("pH: ");
    Serial.print(phValue,2);
    Serial.print("\n");
  }

  client.stop();
  Serial.println("\nUpdating....\n");
  delay(10000);
}

