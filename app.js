// app.js

// URLパラメータ取得
const params = new URLSearchParams(window.location.search);
const appId = params.get("appId");

// SkyWay SDKの利用準備
const { SkyWayRoom, SkyWayContext, SkyWayStreamFactory } = skyway_room;

async function main() {
  // 1. SkyWayのコンテキストを作成
  const context = await SkyWayContext.Create(appId);

  // 2. カメラ・マイクのストリームを取得
  const localStream = await SkyWayStreamFactory.createCameraVideoAndAudioStream();

  // 3. 自分の映像を表示
  const localVideo = document.getElementById("localVideo");
  localStream.attach(localVideo);
  localVideo.play();

  // 4. P2Pルームに参加（ルーム名は固定で "test-room" とする）
  const room = await SkyWayRoom.FindOrCreate(context, { type: "p2p", name: "test-room" });
  const me = await room.join();

  // 5. 自分のストリームを公開
  await me.publish(localStream);

  // 6. 他の人の映像が来たら表示
  me.onStreamPublished.add(e => {
    const { stream } = e.publication;
    if (stream) {
      const remoteVideo = document.getElementById("remoteVideo");
      stream.attach(remoteVideo);
      remoteVideo.play();
    }
  });
}

main().catch(console.error);
