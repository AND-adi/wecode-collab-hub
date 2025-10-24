import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

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
      cleanup();
    };
  }, [sessionId, navigate]);

  const joinSession = async (userId: string) => {
    const { error } = await supabase.from("session_participants").insert({
      session_id: sessionId,
      user_id: userId,
    });

    if (error) {
      console.error("Error joining session:", error);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup peer connection (simplified for now)
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.current = pc;
    } catch (error) {
      console.error("Error setting up WebRTC:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera/microphone",
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

  const handleCodeChange = async (newCode: string) => {
    setCode(newCode);
    
    // Debounce the update
    const { error } = await supabase
      .from("coding_sessions")
      .update({ code_content: newCode })
      .eq("id", sessionId);

    if (error) {
      console.error("Error updating code:", error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;

    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: currentUser.id,
      message: message.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient">Coding Session</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleVideo}>
              {isVideoEnabled ? <Video /> : <VideoOff />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleAudio}>
              {isAudioEnabled ? <Mic /> : <MicOff />}
            </Button>
            <Button variant="destructive" size="icon" onClick={endSession}>
              <PhoneOff />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-4 grid grid-cols-3 gap-4">
        {/* Video Section */}
        <Card className="col-span-1 card-glass p-4 space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 w-32 h-24 bg-black rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 space-y-4">
            <div className="h-64 bg-background/50 rounded-lg p-4 overflow-y-auto space-y-2">
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
                    className={`max-w-[80%] rounded-lg p-2 ${
                      msg.user_id === currentUser?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
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
                className="flex-1"
              />
              <Button onClick={sendMessage} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Code Editor */}
        <Card className="col-span-2 card-glass p-4">
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full h-full bg-background/50 text-foreground font-mono p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Start coding together..."
          />
        </Card>
      </div>
    </div>
  );
};

export default CodeSession;
