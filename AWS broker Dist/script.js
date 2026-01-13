const MQTT_BROKER = "13.53.87.92"; 
const MQTT_PORT = 8083; 
const CLIENT_ID = "uom_web_" + Math.random().toString(16).substr(2, 5);
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

let client;
let alarmStates = { ALARM1: false, ALARM2: false, ALARM3: false, ALARM4: false, SIRENX: false };

function initMQTT() {
    if (typeof Paho === "undefined") {
        setTimeout(initMQTT, 1000);
        return;
    }
    client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);
    client.onConnectionLost = (resp) => {
        document.getElementById("status-bar").innerText = "● RECONNECTING...";
        document.getElementById("status-bar").className = "status-offline";
        setTimeout(connectClient, 5000);
    };
    connectClient();
}

function connectClient() {
    client.connect({
        useSSL: true,
        timeout: 5,
        onSuccess: () => {
            document.getElementById("status-bar").innerText = "● AWS ONLINE";
            document.getElementById("status-bar").className = "status-online";
            startHeartbeat();
        },
        onFailure: (e) => {
            console.log("Error:", e);
            document.getElementById("status-bar").innerText = "● PORT 8083 BLOCKED/OFFLINE";
            document.getElementById("status-bar").className = "status-offline";
        }
    });
}

initMQTT();

function startHeartbeat() {
    if (window.hbInterval) clearInterval(window.hbInterval);
    window.hbInterval = setInterval(() => {
        if (client && client.isConnected()) {
            Object.keys(alarmStates).forEach(id => {
                sendMQTT(id, alarmStates[id] ? "ON" : "OFF");
            });
            document.getElementById("last-sync").innerText = "Heartbeat: " + new Date().toLocaleTimeString();
        }
    }, 5000);
}

function toggleAlarm(id) {
    alarmStates[id] = !alarmStates[id];
    const btn = document.getElementById(id);
    const label = btn.querySelector('.state-label');
    btn.classList.toggle('active-alarm', alarmStates[id]);
    label.innerText = alarmStates[id] ? "ACTIVE" : "OFF";
    sendMQTT(id, alarmStates[id] ? "ON" : "OFF");
}

function sendMQTT(sub, pay) {
    if (client && client.isConnected()) {
        const msg = new Paho.MQTT.Message(pay);
        msg.destinationName = TOPIC_PREFIX + sub;
        msg.qos = 1;
        client.send(msg);
    }
}

function allOff() {
    Object.keys(alarmStates).forEach(id => {
        if (alarmStates[id]) toggleAlarm(id);
    });
}