#include <WiFi.h>
#include <PubSubClient.h> 
#include <driver/i2s.h>

// 1. Network & MQTT Configuration
const char* ssid = "mTera";
const char* password = "12348765";
const char* mqtt_broker = "broker.hivemq.com";
const int mqtt_port = 1883; 
const char* topic_alarm = "uom/mechanical/emergency/2026/system_alpha/ALARM1";

// 2. Hardware Pin Definitions
const int I2S_BCLK = 26;
const int I2S_LRC  = 25;
const int I2S_DOUT = 22;

const int LED_WIFI = 13;   // Red LED 1: WiFi Status
const int LED_SERVER = 14; // Red LED 2: MQTT Status
const int LED_AUDIO = 27;  // Red LED 3: Alarm Status

// 3. Global Variables
WiFiClient espClient;
PubSubClient client(espClient);
bool alarmActive = false;

// 4. Non-blocking Siren Tone Logic
void playSirenSegment() {
    size_t bytes_written;
    static float phase = 0;
    int16_t samples[64];
    
    // Toggle LED flash every 250ms based on system time
    bool state = (millis() % 500) < 250;
    digitalWrite(LED_WIFI, state);
    digitalWrite(LED_SERVER, state);
    digitalWrite(LED_AUDIO, state);

    // Sweeping frequency for warning effect
    float freq = state ? 950.0 : 650.0; 
    for (int i = 0; i < 64; i++) {
        samples[i] = (int16_t)(sin(phase) * 12000); // Volume level
        phase += 2.0 * PI * freq / 16000.0;
        if (phase >= 2.0 * PI) phase -= 2.0 * PI;
    }
    // Write audio to the I2S internal DMA buffer
    i2s_write(I2S_NUM_0, samples, sizeof(samples), &bytes_written, portMAX_DELAY);
}

// 5. MQTT Callback Handler
void callback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (int i = 0; i < length; i++) message += (char)payload[i];
    
    // Debugging output to Serial Monitor
    Serial.print("MQTT Incoming [");
    Serial.print(topic);
    Serial.print("] Content: ");
    Serial.println(message);
    
    if (message == "ON") {
        alarmActive = true;
        Serial.println(">>> ALARM TRIGGERED");
    } 
    else if (message == "OFF") {
        alarmActive = false;
        
        // IMMEDIATE STOP: Clear the remaining audio in the DMA buffer
        i2s_zero_dma_buffer(I2S_NUM_0); 
        
        // Reset LEDs to static status
        digitalWrite(LED_WIFI, HIGH); 
        digitalWrite(LED_SERVER, HIGH); 
        digitalWrite(LED_AUDIO, LOW);
        Serial.println("<<< ALARM DEACTIVATED");
    }
}

// 6. MQTT Reconnection Logic
void reconnect() {
    while (!client.connected()) {
        Serial.print("Connecting to HiveMQ...");
        if (client.connect("ESP32_UOM_Mechanical_Alpha")) {
            Serial.println("Connected.");
            client.subscribe(topic_alarm);
            digitalWrite(LED_SERVER, HIGH);
        } else {
            Serial.print("Failed, rc=");
            Serial.print(client.state());
            Serial.println(" trying again in 3 seconds");
            delay(3000);
        }
    }
}

void setup() {
    Serial.begin(115200);
    
    // Configure LEDs
    pinMode(LED_WIFI, OUTPUT);
    pinMode(LED_SERVER, OUTPUT);
    pinMode(LED_AUDIO, OUTPUT);
    digitalWrite(LED_WIFI, LOW);
    digitalWrite(LED_SERVER, LOW);
    digitalWrite(LED_AUDIO, LOW);

    // I2S Setup for MAX98357A
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .dma_buf_count = 8,
        .dma_buf_len = 512,
        .use_apll = false
    };
    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_BCLK,
        .ws_io_num = I2S_LRC,
        .data_out_num = I2S_DOUT,
        .data_in_num = I2S_PIN_NO_CHANGE
    };
    i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
    i2s_set_pin(I2S_NUM_0, &pin_config);

    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Online.");
    digitalWrite(LED_WIFI, HIGH); 

    client.setServer(mqtt_broker, mqtt_port);
    client.setCallback(callback);
}

void loop() {
    // Check connection and process MQTT messages
    if (!client.connected()) {
        reconnect();
    }
    client.loop(); 

    // Sound generation
    if (alarmActive) {
        playSirenSegment();
    } else {
        // Normal operation: Status LEDs
        digitalWrite(LED_WIFI, WiFi.status() == WL_CONNECTED);
        digitalWrite(LED_SERVER, client.connected());
    }
}