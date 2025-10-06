const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, LocalDataStream, uuidV4 } = window.skyway_room;

let dataStream = null;
let room, me;

// SkyWay認証トークン
const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  version: 3,
  scope: {
    appId: "441577ac-312a-4ffb-aad5-e540d3876971",
    rooms: [{ name: "*", methods: ["create", "close", "updateMetadata"], member: { name: "*", methods: ["publish", "subscribe", "updateMetadata"] } }],
  },
}).encode("Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=");

(async () => {
  const buttonArea = document.getElementById("button-area");
  const remoteVideoArea = document.getElementById("remote-video-area");
  const remoteAudioArea = document.getElementById("remote-audio-area");
  const roomNameInput = document.getElementById("room-name");
  const myId = document.getElementById("my-id");
  const joinButton = document.getElementById("join");
  const leaveButton = document.getElementById("leave");
  leaveButton.disabled = true;

  // データ送信用UI
  const input = document.createElement("input");
  input.placeholder = "送信する文字列";
  const sendButton = document.createElement("button");
  sendButton.textContent = "送信";
  buttonArea.appendChild(input);
  buttonArea.appendChild(sendButton);

  joinButton.onclick = async () => {
    if (!roomNameInput.value) return alert("Room名を入力してください");
    joinButton.disabled = true;
    leaveButton.disabled = false;

    const context = await SkyWayContext.Create(token);
    room = await SkyWayRoom.FindOrCreate(context, { type: "p2p", name: roomNameInput.value });
    me = await room.join();
    myId.textContent = me.id;

    dataStream = new LocalDataStream();
    me.publish(dataStream);

    sendButton.onclick = () => {
      if (input.value) {
        dataStream.write(input.value);
        console.log("送信:", input.value);
        input.value = "";
      }
    };

    const subscribeAndAttach = async (pub) => {
      if (pub.publisher.id === me.id) return;
      const { stream } = await me.subscribe(pub.id);

      if (stream.track) {
        let remoteMedia;
        if (stream.track.kind === "video") {
          remoteMedia = document.createElement("video");
          remoteMedia.autoplay = true;
          remoteMedia.playsInline = true;
          stream.attach(remoteMedia);
          remoteVideoArea.appendChild(remoteMedia);
        } else if (stream.track.kind === "audio") {
          remoteMedia = document.createElement("audio");
          remoteMedia.autoplay = true;
          remoteMedia.controls = true;
          stream.attach(remoteMedia);
          remoteAudioArea.appendChild(remoteMedia);
        }
      } else if (stream instanceof skyway_room.RemoteDataStream) {
        stream.onData.add((msg) => console.log("受信:", msg));
      }
    };

    room.publications.forEach(subscribeAndAttach);
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

    leaveButton.onclick = async () => {
      await me.leave();
      await room.dispose();
      myId.textContent = "未接続";
      joinButton.disabled = false;
      leaveButton.disabled = true;
    };
  };
})();

// 🎮 ジョイスティック
const joystick = document.getElementById("joystick");
const container = document.getElementById("joystickContainer");
const output = document.getElementById("output");

let dragging = false;
let center = 0;
let maxRange = 0;

const xBase = 1000, xMin = 0, xMax = 2000;
const yBase = 1000, yMin = 0, yMax = 1300;

function calcCenter() {
  const size = container.offsetWidth;
  center = size / 2;
  maxRange = center;
}
window.addEventListener("resize", calcCenter);
calcCenter();

function resetJoystick() {
  joystick.style.left = `${center - joystick.offsetWidth / 2}px`;
  joystick.style.top = `${center - joystick.offsetHeight / 2}px`;
}
resetJoystick();

function toServoX(pos) {
  return Math.round(xBase + (pos * (xMax - xMin) / 2) / maxRange);
}
function toServoY(pos) {
  return Math.round(yBase + (pos * (yMax - yMin) / 2) / maxRange);
}

function updateCommand(x, y) {
  const servoX = toServoX(x);
  const servoY = toServoY(-y);
  const cmdX = `MOVE 1 ${servoX} 1000`;
  const cmdY = `MOVE 2 ${servoY} 1000`;
  output.textContent = `コマンド: ${cmdX} | ${cmdY}`;

  if (dataStream) {
    dataStream.write(cmdX);
    dataStream.write(cmdY);
    console.log("送信中:", cmdX, cmdY);
  }
}

function moveJoystick(clientX, clientY) {
  const rect = container.getBoundingClientRect();
  let x = clientX - rect.left - center;
  let y = clientY - rect.top - center;
  const dist = Math.sqrt(x * x + y * y);
  if (dist > maxRange) {
    x = (x / dist) * maxRange;
    y = (y / dist) * maxRange;
  }
  joystick.style.left = `${center - joystick.offsetWidth / 2 + x}px`;
  joystick.style.top = `${center - joystick.offsetHeight / 2 + y}px`;
  updateCommand(x, y);
}

joystick.addEventListener("mousedown", () => (dragging = true));
document.addEventListener("mouseup", () => {
  if (dragging) {
    dragging = false;
    resetJoystick();
    updateCommand(0, 0);
  }
});
document.addEventListener("mousemove", (e) => {
  if (dragging) moveJoystick(e.clientX, e.clientY);
});

joystick.addEventListener("touchstart", () => (dragging = true));
document.addEventListener("touchend", () => {
  if (dragging) {
    dragging = false;
    resetJoystick();
    updateCommand(0, 0);
  }
});
document.addEventListener("touchmove", (e) => {
  if (!dragging) return;
  const touch = e.touches[0];
  moveJoystick(touch.clientX, touch.clientY);
  e.preventDefault();
});
