// 页面加载前验证登录状态，避免闪现主界面
(function() {
  const token = localStorage.getItem("openclaw_token");
  if (!token) {
    window.location.href = "/login.html";
  }
})();
