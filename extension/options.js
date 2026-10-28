import { apiBase } from "./config.js";
const input = document.getElementById("api");
input.value = await apiBase();
document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({ apiBase: input.value.trim() });
  document.getElementById("msg").textContent = "Uloženo.";
});
