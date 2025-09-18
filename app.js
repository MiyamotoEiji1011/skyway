// app.js

// URLパラメータを取得
const params = new URLSearchParams(window.location.search);
const appId = params.get("appId");
const secret = params.get("secret");

// デバッグ用に表示（あとで消す）
console.log("AppID:", appId);
console.log("Secret:", secret);

// ページに表示（確認用）
document.body.insertAdjacentHTML("beforeend", `
  <p>AppID: ${appId}</p>
  <p>Secret: ${secret}</p>
`);
