import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Globe } from "lucide-react";
import { z } from "zod";

interface Message {
  id: string;
  created_at: string;
  message: string;
  user_id: string;
  user_email: string;
}

const WorldChat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use World Chat",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email || "Anonymous");
    };

    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    if (!currentUserId) return;

    // Load initial messages
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("world_chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages(data || []);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("world-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "world_chat_messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const messageSchema = z.object({
    message: z
      .string()
      .trim()
      .min(1, "Message cannot be empty")
      .max(500, "Message must be less than 500 characters"),
  });

  const sendMessage = async () => {
    if (!currentUserId) return;

    const validation = messageSchema.safeParse({ message: newMessage });
    
    if (!validation.success) {
      toast({
        title: "Invalid message",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("world_chat_messages").insert({
      message: validation.data.message,
      user_id: currentUserId,
      user_email: currentUserEmail,
    });

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">World Chat</h1>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-lg border p-4 flex flex-col h-[600px]">
          <div className="mb-4">
            <p className="text-muted-foreground text-sm">
              Connect with people from around the world! Share ideas, ask questions, and make new friends.
            </p>
          </div>

          <ScrollArea className="flex-1 pr-4 mb-4">
            <div className="space-y-4" ref={scrollRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.user_id === currentUserId ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.user_id === currentUserId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-70">
                      {msg.user_email}
                    </p>
                    <p className="break-words">{msg.message}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
              maxLength={500}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldChat;
