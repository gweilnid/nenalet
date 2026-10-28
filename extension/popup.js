document.getElementById("page").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "check-current-page" });
  window.close();
});
document.getElementById("go").addEventListener("click", async () => {
  const text = document.getElementById("text").value.trim();
  if (!text) return;
  await chrome.runtime.sendMessage({ type: "check-text", text });
  window.close();
});
