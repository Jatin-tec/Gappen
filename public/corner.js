function chatOpen() {
    document.getElementById("chat-open").style.display = "none";
    document.getElementById("chat-close").style.display = "block";
    document.getElementById("chat-window2").style.display = "block";
  }
  function chatClose() {
    document.getElementById("chat-open").style.display = "block";
    document.getElementById("chat-close").style.display = "none";
    document.getElementById("chat-window1").style.display = "none";
    document.getElementById("chat-window2").style.display = "none";
  }
  function openConversation() {
    document.getElementById("chat-window2").style.display = "block";
    document.getElementById("chat-window1").style.display = "none";
  }