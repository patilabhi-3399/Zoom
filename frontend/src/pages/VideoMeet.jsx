import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ChatIcon from '@mui/icons-material/Chat';
import styles from "../styles/videoComponent.module.css";
import server from '../environment';

const server_url = server;

// Peer connections and tracking
const connections = {};
const politePeers = {};
const makingOffer = {};
const ignoreOffer = {};

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [showModal, setModal] = useState(false);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    getPermissions();
  }, []);

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoAvailable(!!videoPermission);
      const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioAvailable(!!audioPermission);
    } catch (error) {
      console.log(error);
    }
  };

  const connect = async () => {
    try {
      setAskForUsername(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoAvailable,
        audio: audioAvailable,
      });
      window.localStream = stream;
      if (localVideoref.current) localVideoref.current.srcObject = stream;
      connectToSocketServer();
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Please allow camera and microphone access.");
    }
  };

  const createPeerConnection = (socketId) => {
    if (connections[socketId]) return connections[socketId];

    const pc = new RTCPeerConnection(peerConfigConnections);

    // Add local tracks
    if (window.localStream) {
      window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
    }

    // Remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setVideos(prev => [...prev.filter(v => v.socketId !== socketId), { socketId, stream }]);
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("signal", socketId, JSON.stringify({ ice: event.candidate }));
      }
    };

    connections[socketId] = pc;
    return pc;
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on('connect', () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit('join-call', window.location.href);
      console.log("Connected to call:", socketIdRef.current);
    });

    // Existing users when we join
    socketRef.current.on("existing-users", (users) => {
      users.forEach(id => {
        if (id === socketIdRef.current) return;
        const pc = createPeerConnection(id);
        makingOffer[id] = true;
        pc.createOffer()
          .then(desc => pc.setLocalDescription(desc))
          .then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({ sdp: pc.localDescription }));
            makingOffer[id] = false;
          }).catch(console.error);
      });
    });

    socketRef.current.on('signal', gotMessageFromServer);

    // New user joined
    socketRef.current.on('user-joined', (id, clients) => {
      clients.forEach(socketListId => createPeerConnection(socketListId));

      if (id === socketIdRef.current) {
        clients.forEach(socketListId => {
          if (socketListId === socketIdRef.current) return;
          const pc = createPeerConnection(socketListId);
          makingOffer[socketListId] = true;
          pc.createOffer()
            .then(desc => pc.setLocalDescription(desc))
            .then(() => {
              socketRef.current.emit("signal", socketListId, JSON.stringify({ sdp: pc.localDescription }));
              makingOffer[socketListId] = false;
            }).catch(console.error);
        });
      }
    });

    // User left
    socketRef.current.on('user-left', (id) => {
      setVideos(prev => prev.filter(v => v.socketId !== id));
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }
    });

    socketRef.current.on('chat-message', addMessage);
  };

  const gotMessageFromServer = async (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;

    const pc = createPeerConnection(fromId);
    politePeers[fromId] = true;

    const readyForOffer = !makingOffer[fromId] && (pc.signalingState === "stable" || ignoreOffer[fromId]);
    const offerCollision = signal.sdp && signal.sdp.type === "offer" && !readyForOffer;
    ignoreOffer[fromId] = !politePeers[fromId] && offerCollision;
    if (ignoreOffer[fromId]) return;

    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit("signal", fromId, JSON.stringify({ sdp: pc.localDescription }));
        }
      }
      if (signal.ice) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
        } catch (e) {
          if (!ignoreOffer[fromId]) console.error(e);
        }
      }
    } catch (e) {
      console.error("Error handling remote description:", e);
    }
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages(prev => [...prev, { sender, data }]);
    if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
  };

  const handleVideo = () => {
    if (window.localStream) {
      const videoTrack = window.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideo(videoTrack.enabled);
      }
    }
  };

  const handleAudio = () => {
    if (window.localStream) {
      const audioTrack = window.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudio(audioTrack.enabled);
      }
    }
  };

  const sendMessage = () => {
    if (message.trim() !== "" && socketRef.current) {
      socketRef.current.emit('chat-message', message, username, socketIdRef.current);
      setMessages(prev => [...prev, { sender: username, data: message }]);
      setMessage("");
    }
  };

  const handleEndCall = () => {
    try {
      const tracks = localVideoref.current.srcObject?.getTracks();
      tracks?.forEach(track => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };

  return (
    <div>
      {askForUsername ? (
        <div style={{
          backgroundImage: 'url("/lobby.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'white',
          textAlign: 'center',
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '40px',
            borderRadius: '20px',
            backdropFilter: 'blur(6px)',
            width: '90%',
            maxWidth: '400px',
          }}>
            <h2 style={{ marginBottom: '20px' }}>Enter into Lobby</h2>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="outlined"
              InputLabelProps={{ style: { color: '#fff' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#90caf9' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                },
                mb: 2,
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={connect}
              fullWidth
              sx={{ fontWeight: 'bold', paddingY: '10px' }}
            >
              Connect
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            <Badge badgeContent={newMessages} max={999} color="secondary">
              <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>
          <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>
          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => { if (ref && video.stream) ref.srcObject = video.stream; }}
                  autoPlay
                  playsInline
                ></video>
              </div>
            ))}
          </div>
          {showModal && (
            <div style={{
              position: 'absolute',
              bottom: '80px',
              right: '20px',
              width: '300px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '10px',
              borderRadius: '10px',
              color: 'white'
            }}>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {messages.map((m, i) => (
                  <p key={i}><strong>{m.sender}:</strong> {m.data}</p>
                ))}
              </div>
              <TextField
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                label="Type a message"
                variant="outlined"
                size="small"
                InputLabelProps={{ style: { color: 'white' } }}
                InputProps={{ style: { color: 'white' } }}
                fullWidth
              />
              <Button variant="contained" size="small" onClick={sendMessage} sx={{ mt: 1 }}>
                Send
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
