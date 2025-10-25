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
    <div className="min-h-screen bg-background">
      {/* Video Chat Section - Omegle Style */}
      <div className="relative h-[60vh] bg-black">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Connected
                </span>
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                {participants.length} participant(s)
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="secondary" 
                size="icon" 
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
                onClick={endSession}
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Code Editor Section */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Code Editor - Takes most space */}
          <Card className="lg:col-span-3 card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gradient">Shared Code Editor</h2>
              <Badge variant="outline" className="bg-primary/10 border-primary text-primary">
                Live Sync
              </Badge>
            </div>
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-[500px] bg-black/50 text-foreground font-mono text-sm p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="// Start coding together..."
              spellCheck="false"
            />
          </Card>

          {/* Chat Sidebar */}
          <Card className="lg:col-span-1 card-glass p-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Chat</h3>
            <div className="flex flex-col h-[500px]">
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
                  placeholder="Message..."
                  className="flex-1 text-sm"
                />
                <Button onClick={sendMessage} size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CodeSession;
