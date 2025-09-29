const { SkyWayContext, SkyWayRoom, SkyWayStreamFactory } = skyway_core;

document.getElementById('connectBtn').addEventListener('click', async () => {
  const token = document.getElementById('token').value;
  const roomName = document.getElementById('roomName').value;
  const statusEl = document.getElementById('status');

  if (!token || !roomName) {
    alert("TokenとRoom名を入力してください。");
    return;
  }

  try {
    // SkyWay Contextを初期化
    const context = await SkyWayContext.Create(token);

    // Roomを取得（なければ新規作成）
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: 'sfu',
      name: roomName,
    });

    // Roomに参加
    const me = await room.join();

    // 自分のカメラ・マイクを取得
    const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
    await me.publish(audio);
    await me.publish(video);

    // 自分の映像を表示
    const myVideo = document.getElementById('myVideo');
    video.attach(myVideo);
    myVideo.play();

    // リモートメンバーのストリームを受信
    room.onMemberJoined.add(async (member) => {
      member.onPublicationSubscribed.add((sub) => {
        if (sub.stream.track.kind === 'video') {
          const remoteVideo = document.createElement('video');
          sub.stream.attach(remoteVideo);
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          document.getElementById('remoteVideos').appendChild(remoteVideo);
        }
      });
    });

    statusEl.textContent = "Roomに参加しました: " + roomName;

  } catch (err) {
    statusEl.textContent = "エラー: " + err.message;
    console.error(err);
  }
});
