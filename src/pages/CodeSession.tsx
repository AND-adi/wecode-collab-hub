import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Send } from "lucide-react";

const CodeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [code, setCode] = useState("// Start coding here...");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const signalingChannel = useRef<any>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
      joinSession(user.id);
    });

    // Subscribe to code changes
    const codeChannel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coding_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setCode(payload.new.code_content);
        }
      )
      .subscribe();

    // Subscribe to chat messages
    const chatChannel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Setup WebRTC
    setupWebRTC();

    return () => {
      codeChannel.unsubscribe();
      chatChannel.unsubscribe();
      if (signalingChannel.current) {
        signalingChannel.current.unsubscribe();
      }
      cleanup();
    };
  }, [sessionId, navigate]);

  const joinSession = async (userId: string) => {
    const { error } = await supabase.from("session_participants").insert({
      session_id: sessionId,
      user_id: userId,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to join session",
        variant: "destructive",
      });
      navigate("/random-match");
      return;
    }

    // Load existing data
    loadSessionData();
  };

  const loadSessionData = async () => {
    // Load code
    const { data: sessionData } = await supabase
      .from("coding_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionData) {
      setCode(sessionData.code_content);
    }

    // Load messages
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      setMessages(messagesData);
    }

    // Load participants
    const { data: participantsData } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId);

    if (participantsData) {
      setParticipants(participantsData);
    }
  };

  const setupWebRTC = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup peer connection with STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming tracks from remote peer
      pc.ontrack = (event) => {
        console.log("Received remote track");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnecting(false);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && signalingChannel.current) {
          console.log("Sending ICE candidate");
          signalingChannel.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: {
              candidate: event.candidate,
              sessionId,
            },
          });
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setIsConnecting(false);
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          toast({
            title: "Connection Issue",
            description: "Trying to reconnect...",
            variant: "destructive",
          });
        }
      };

      peerConnection.current = pc;

      // Setup signaling channel for WebRTC
      signalingChannel.current = supabase.channel(`webrtc-${sessionId}`);

      signalingChannel.current
        .on("broadcast", { event: "offer" }, async ({ payload }: any) => {
          console.log("Received offer");
          if (peerConnection.current && payload.sessionId === sessionId) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(payload.offer)
            );
            
            // Process queued ICE candidates
            while (iceCandidatesQueue.current.length > 0) {
              const candidate = iceCandidatesQueue.current.shift();
              if (candidate) {
                await peerConnection.current.addIceCandidate(candidate);
              }
            }

            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            signalingChannel.current.send({
              type: "broadcast",
              event: "answer",
              payload: {
                answer,
                sessionId,
              },
            });
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }: any) => {
          console.log("Received answer");
          if (peerConnection.current && payload.sessionId === sessionId) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            );
            
            // Process queued ICE candidates
            while (iceCandidatesQueue.current.length > 0) {
              const candidate = iceCandidatesQueue.current.shift();
              if (candidate) {
                await peerConnection.current.addIceCandidate(candidate);
              }
            }
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }: any) => {
          console.log("Received ICE candidate");
          if (peerConnection.current && payload.sessionId === sessionId) {
            try {
              const candidate = new RTCIceCandidate(payload.candidate);
              
              // If remote description is set, add candidate immediately
              if (peerConnection.current.remoteDescription) {
                await peerConnection.current.addIceCandidate(candidate);
              } else {
                // Queue candidates until remote description is set
                iceCandidatesQueue.current.push(candidate);
              }
            } catch (error) {
              console.error("Error adding ICE candidate:", error);
            }
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            console.log("Signaling channel subscribed");
            
            // Check if we should create an offer (first user in the session)
            const { data: participantsData } = await supabase
              .from("session_participants")
              .select("*")
              .eq("session_id", sessionId)
              .order("created_at", { ascending: true });

            if (participantsData && participantsData.length > 0) {
              const firstParticipant = participantsData[0];
              const { data: { user } } = await supabase.auth.getUser();
              
              // If current user is the first participant, create offer
              if (user && firstParticipant.user_id === user.id && peerConnection.current) {
                console.log("Creating offer as first participant");
                const offer = await peerConnection.current.createOffer();
                await peerConnection.current.setLocalDescription(offer);

                signalingChannel.current.send({
                  type: "broadcast",
                  event: "offer",
                  payload: {
                    offer,
                    sessionId,
                  },
                });
              }
            }
          }
        });
    } catch (error) {
      console.error("WebRTC setup error:", error);
      setIsConnecting(false);
      toast({
        title: "Camera Error",
        description: "Could not access camera/microphone. Please allow permissions and refresh.",
        variant: "destructive",
      });
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  const MAX_CODE_SIZE = 1024 * 100; // 100KB limit

  const handleCodeChange = async (newCode: string) => {
    // Validate code size
    const sizeInBytes = new Blob([newCode]).size;
    if (sizeInBytes > MAX_CODE_SIZE) {
      toast({
        title: "Code Size Limit",
        description: "Code content exceeds 100KB limit",
        variant: "destructive",
      });
      return;
    }

    setCode(newCode);
    
    // Debounce the update
    const { error } = await supabase
      .from("coding_sessions")
      .update({ code_content: newCode })
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to sync code changes",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;

    const { data, error } = await supabase.functions.invoke('send-chat-message', {
      body: {
        sessionId,
        message: message.trim(),
      },
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } else {
      setMessage("");
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const endSession = async () => {
    cleanup();
    navigate("/random-match");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Video Sections & Chat */}
          <div className="lg:col-span-1 space-y-4">
            {/* Video Sections - Google Meet Style */}
            <div className="space-y-4">
              {/* Remote Participant Video */}
              <Card className="card-glass overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {isConnecting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-white text-sm">Connecting to peer...</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs">
                    Participant
                  </div>
                </div>
              </Card>

              {/* Local User Video */}
              <Card className="card-glass overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs">
                    You
                  </div>
                </div>
              </Card>
            </div>

            {/* Chat Box */}
            <Card className="card-glass p-4">
              <h3 className="text-lg font-semibold mb-3 text-foreground">Chat</h3>
              <div className="flex flex-col h-64">
                <div className="flex-1 bg-background/30 rounded-lg p-3 overflow-y-auto space-y-2 mb-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.user_id === currentUser?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-2 ${
                          msg.user_id === currentUser?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-xs break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 text-sm"
                  />
                  <Button onClick={sendMessage} size="icon" className="shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="w-full flex flex-col items-center gap-1 h-auto py-3"
                onClick={endSession}
              >
                <PhoneOff className="w-5 h-5" />
                <span className="text-xs">Skip</span>
              </Button>
              <Button
                variant="default"
                className="w-full flex flex-col items-center gap-1 h-auto py-3 bg-gradient-to-r from-secondary to-primary"
                onClick={() => {
                  toast({
                    title: "Collaboration Mode",
                    description: "You can now code together!",
                  });
                }}
              >
                <Video className="w-5 h-5" />
                <span className="text-xs">Collaborate</span>
              </Button>
              <Button
                variant="destructive"
                className="w-full flex flex-col items-center gap-1 h-auto py-3"
                onClick={endSession}
              >
                <PhoneOff className="w-5 h-5" />
                <span className="text-xs">End Call</span>
              </Button>
            </div>

            {/* Video Controls */}
            <div className="flex justify-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Right Side - Code Editor */}
          <Card className="lg:col-span-2 card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gradient">Shared Code Editor</h2>
              <Badge variant="outline" className="bg-primary/10 border-primary text-primary">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live Sync
                </span>
              </Badge>
            </div>
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-[calc(100vh-12rem)] bg-black/50 text-foreground font-mono text-sm p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="// Start coding together..."
              spellCheck="false"
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CodeSession;
