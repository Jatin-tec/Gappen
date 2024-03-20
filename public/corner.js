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
function userResponse() {
  const userText = document.getElementById("textInput").value;
  const audio3 = new Audio(
    "https://prodigits.co.uk/content/ringtones/tone/2020/alert/preview/4331e9c25345461.mp3"
  );

  if (userText == "") {
    alert("Please type something!");
  } else {
    const objDiv = document.getElementById("messageBox");

    objDiv.innerHTML += `<div class="first-chat">
        <p>${userText}</p>
        <div class="arrow"></div>
        </div>`;
    audio3.load();
    audio3.play();

    document.getElementById("textInput").value = "";
    objDiv.innerHTML += `<div class="second-chat">
          <div class="circle" id="circle-mar"></div>
          <p class="bot_mssg_box"></p>
          <div class="arrow"></div> 
        </div>`;
    objDiv.scrollTop = objDiv.scrollHeight;
    socket.emit("user_message", { "message": userText });
    console.log(document.getElementById("textInput").value);
  }
}
