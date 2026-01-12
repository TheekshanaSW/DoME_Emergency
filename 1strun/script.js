// --- CONFIGURATION ---
const MQTT_BROKER = "broker.hivemq.com";
const MQTT_PORT = 8884; // Secure WebSocket Port
const CLIENT_ID = "uom_mech_web_" + Math.random().toString(16).substr(2, 5);

// Use a unique path to prevent others from accidentally triggering your hardware
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

const options = {
    useSSL: true, // Required for HTTPS hosting
    timeout: 3,
    keepAliveInterval: 30,
    onSuccess: onConnect,
    onFailure: onFail
};

// Start Connection
client.connect(options);

function onConnect() {
    console.log("Connected to HiveMQ");
    const status = document.getElementById("status-bar");
    status.innerText = "● SYSTEM ONLINE (SECURE)";
    status.className = "status-online";
}

function onFail(e) {
    console.error("Connection Failed:", e);
    const status = document.getElementById("status-bar");
    status.innerText = "● CONNECTION FAILED - RETRYING";
    status.className = "status-offline";
    setTimeout(() => client.connect(options), 5000);
}

// Publishing Function
function sendMQTT(subtopic) {
    if (!client.isConnected()) {
        console.warn("Not connected to broker.");
        return;
    }
    const message = new Paho.MQTT.Message("ON");
    message.destinationName = TOPIC_PREFIX + subtopic;
    message.qos = 1; // Handshake to ensure delivery
    client.send(message);
    console.log("Sent ON to: " + message.destinationName);
}

// Master Function
function triggerAll() {
    const confirmation = confirm("WARNING: This will activate ALL alarms. Proceed?");
    if (confirmation) {
        const nodes = ['ALARM1', 'ALARM2', 'ALARM3', 'ALARM4', 'SIRENX'];
        nodes.forEach(node => sendMQTT(node));
    }
}