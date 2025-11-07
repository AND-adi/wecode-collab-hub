import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Copy, Code2 } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LiveCollaboration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionName, setSessionName] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkAuth();
  }, []);

  const handleCreateSession = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a session",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsCreating(true);
    try {
      // Create session in "waiting" status until another user joins
      const { data, error } = await supabase
        .from("coding_sessions")
        .insert({
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      // Add current user as participant
      const { error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: data.id,
          user_id: userId,
        });

      if (participantError) throw participantError;

      toast({
        title: "Session created!",
        description: "Share the session code with your teammate to start voice chat",
      });

      navigate(`/session/${data.id}?waiting=true`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a session",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!sessionCode.trim()) {
      toast({
        title: "Session code required",
        description: "Please enter a session code",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      // Check if session exists
      const { data: session, error } = await supabase
        .from("coding_sessions")
        .select("*")
        .eq("id", sessionCode.trim())
        .single();

      if (error) {
        throw new Error("Session not found");
      }

      // Add user as participant
      const { error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: userId,
        });

      if (participantError && participantError.code !== "23505") {
        throw participantError;
      }

      // Update session status to active when second user joins
      await supabase
        .from("coding_sessions")
        .update({ status: "active" })
        .eq("id", session.id);

      toast({
        title: "Joined session!",
        description: "Starting voice chat with your teammate...",
      });

      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error("Error joining session:", error);
      toast({
        title: "Error",
        description: "Failed to join session. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Button>

        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary glow-primary mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold text-gradient">Live Collaboration</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Code together in real-time with your team. Share a session and watch changes appear instantly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-glass p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Create Session</h3>
                <p className="text-muted-foreground">Start a new collaboration session</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  placeholder="Session name (optional)"
                  className="bg-background/50 border-border"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                  onClick={handleCreateSession}
                  disabled={isCreating}
                >
                  <Code2 className="mr-2 w-5 h-5" />
                  {isCreating ? "Creating..." : "Create Session"}
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  A unique session code will be generated
                </p>
              </div>
            </Card>

            <Card className="card-glass p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Join Session</h3>
                <p className="text-muted-foreground">Enter a session code to join</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  placeholder="Enter session code"
                  className="bg-background/50 border-border font-mono"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinSession()}
                />
                <Button 
                  variant="outline" 
                  className="w-full border-primary/50 hover:bg-primary/10"
                  onClick={handleJoinSession}
                  disabled={isJoining}
                >
                  <Users className="mr-2 w-5 h-5" />
                  {isJoining ? "Joining..." : "Join Session"}
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  Get the code from your teammate
                </p>
              </div>
            </Card>
          </div>

          <Card className="card-glass p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-medium text-foreground">Real-time Sync</h4>
                <p className="text-sm text-muted-foreground">See changes instantly as others type</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <h4 className="font-medium text-foreground">Multi-cursor</h4>
                <p className="text-sm text-muted-foreground">See where everyone is coding</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-medium text-foreground">Easy Sharing</h4>
                <p className="text-sm text-muted-foreground">Share with a simple code</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveCollaboration;
