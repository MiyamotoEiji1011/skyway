// SkyWay SDKから必要なクラスを取得
const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  LocalDataStream,
  uuidV4,
} = window.skyway_room;

// グローバル変数
let dataStream = null;
let room, me;

// SkyWay認証トークン（実際の値に置き換えて使用）
const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  version: 3,
  scope: {
    appId: "441577ac-312a-4ffb-aad5-e540d3876971",
    rooms: [
      {
        name: "*",
        methods: ["create", "close", "updateMetadata"],
        member: {
          name: "*",
          methods: ["publish", "subscribe", "updateMetadata"],
        },
      },
    ],
  },
}).encode("Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=");

window.addEventListener("DOMContentLoaded", async () => {
  const buttonArea = document.createElement("div");
  document.body.appendChild(buttonArea);

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

  // 入室処理
  joinButton.onclick = async () => {
    if (!roomNameInput.value) return alert("Room名を入力してください");
    joinButton.disabled = true;
    leaveButton.disabled = false;

    const context = await SkyWayContext.Create(token);
    room = await SkyWayRoom.FindOrCreate(context, {
      type: "p2p",
      name: roomNameInput.value,
    });

    me = await room.join();
    myId.textContent = me.id;

    // データストリーム作成
    dataStream = new LocalDataStream();
    me.publish(dataStream);

    sendButton.onclick = () => {
      if (input.value) {
        dataStream.write(input.value);
        console.log("送信:", input.value);
        input.value = "";
      }
    };

    // ストリーム購読
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

    // 退室処理
    leaveButton.onclick = async () => {
      await me.leave();
      await room.dispose();
      myId.textContent = "";
      buttonArea.replaceChildren();
      remoteVideoArea.replaceChildren();
      remoteAudioArea.replaceChildren();
      joinButton.disabled = false;
      leaveButton.disabled = true;
    };
  };

  // =============== ジョイスティック処理 ===============
  const joystick = document.getElementById("joystick");
  const container = document.getElementById("joystickContainer");
  const output = document.getElementById("output");

  let dragging = false;
  let center = 0;
  let maxRange = 0;

  const xBase = 1000,
    xMin = 0,
    xMax = 2000;
  const yBase = 1000,
    yMin = 0,
    yMax = 1300;

  // センター位置計算
  function calcCenter() {
    const rect = container.getBoundingClientRect();
    center = rect.width / 2;
    maxRange = center;
  }

  // 中央に戻す
  function resetJoystick() {
    joystick.style.left = `${center - joystick.offsetWidth / 2}px`;
    joystick.style.top = `${center - joystick.offsetHeight / 2}px`;
  }

  // 値変換関数
  function toServoX(pos) {
    return Math.round(xBase + (pos * (xMax - xMin) / 2) / maxRange);
  }
  function toServoY(pos) {
    return Math.round(yBase + (pos * (yMax - yMin) / 2) / maxRange);
  }

  // コマンド更新
  function updateCommand(x, y) {
    const servoX = toServoX(x);
    const servoY = toServoY(-y);
    const cmdX = `MOVE 1 ${servoX} 1000`;
    const cmdY = `MOVE 2 ${servoY} 1000`;
    output.textContent = `コマンド: ${cmdX} | ${cmdY}`;

    if (dataStream && Date.now() % 2 === 0) {
      dataStream.write(cmdX);
      dataStream.write(cmdY);
      console.log("送信中:", cmdX, cmdY);
    }
  }

  // 実際の移動処理
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

  // 初期化（DOM描画後に呼ぶ）
  setTimeout(() => {
    calcCenter();
    resetJoystick();
  }, 100);

  window.addEventListener("resize", () => {
    calcCenter();
    resetJoystick();
  });

  // マウス操作
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

  // タッチ操作
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
});
