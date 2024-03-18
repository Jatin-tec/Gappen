// client/main.js
const socket = io();

async function initializeChat() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      document.getElementById('localStream').srcObject = localStream;
      const username = document.getElementById('localUsername').getAttribute('data-username');
      socket.emit('join', username);
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  }

socket.on('roomJoined', handleRoomJoined)

socket.on('offer', (offer, roomId, candidateQueue) => handleOffer(offer, roomId, candidateQueue))
socket.on('answer', (answer, candidateQueue) => handleAnswer(answer, candidateQueue))
socket.on('ice-candidate', (candidate) => handleCandidate(candidate))

socket.on('setUsername', handleSetUsername)
socket.on('userSkipped', () => handleSkip())
socket.on('skip', () => handleSkip())
socket.on('partnerDisconnected', () => handlePartnerDisconnected())
socket.on('receive-message', (message) => handleReceiveMessage(message))
socket.on('leave', () => handleLeave())

initializeChat();