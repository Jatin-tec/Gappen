function chatOpen() {
  document.getElementById("chat-open").style.display = "none";
  document.getElementById("chat-close").style.display = "block";
  document.getElementById("chat-window2").style.display = "block";
}
function chatClose() {
  document.getElementById("chat-open").style.display = "block";
  document.getElementById("chat-close").style.display = "none";
  document.getElementById("chat-window2").style.display = "none";
}
function openConversation() {
  document.getElementById("chat-window2").style.display = "block";
  document.getElementById("chat-window1").style.display = "none";
}

function userResponse() {
  const userText = document.getElementById("textInput").value;

  if (userText == "") {
    alert("Please type something!");
  } else {
    const objDiv = document.getElementById("messageBox");

    objDiv.innerHTML += `<div class="first-chat">
    <p>${userText}</p>
    <div class="arrow"></div>
    </div>`;
    const audio3 = new Audio(
      "https://prodigits.co.uk/content/ringtones/tone/2020/alert/preview/4331e9c25345461.mp3"
    );
    audio3.load();
    audio3.play();

    document.getElementById("textInput").value = "";

    const roomId = document.getElementById("roomId").innerText;
    socket.emit("send-message", userText, roomId);
  }
}

const handleReceiveMessage = (response) => {
  console.log(response);
  const objDiv = document.getElementById("messageBox");
  objDiv.innerHTML += `<div class="second-chat">
        <div class="circle" id="circle-mar"></div>
        <p class="bot_mssg_box"></p>
        <div class="arrow"></div> 
      </div>`;

  const nodes = document.querySelectorAll(".bot_mssg_box")
  const last = nodes[nodes.length - 1];
  last.append(` ${response} `);
  const audio3 = new Audio(
    "https://downloadwap.com/content2/mp3-ringtones/tone/2020/alert/preview/56de9c2d5169679.mp3"
  );
  audio3.load();
  audio3.play();
  objDiv.scrollTop = objDiv.scrollHeight;
}

// mic toggle
const changeText = document.querySelector("#mute");

        changeText.addEventListener("click", function() {
          if (changeText.textContent === "mic_off") {
            changeText.textContent = "mic";
          } else {
            changeText.textContent = "mic_off";
          }
        });