import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Video, Shuffle, Code, Globe, Loader2 } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const RandomMatch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const skills = ["JavaScript", "Python", "React", "Node.js", "TypeScript", "Go"];
  const levels = ["Beginner", "Intermediate", "Advanced"];

  useEffect(() => {
    // Check auth status
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  const findMatch = async () => {
    if (selectedLanguages.length === 0) {
      toast({
        title: "Select Languages",
        description: "Please select at least one programming language",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) return;

    setIsSearching(true);

    try {
      // Add user to matching queue
      const { error: queueError } = await supabase
        .from("matching_queue")
        .insert({
          user_id: currentUser.id,
          skill_level: selectedLevel,
          preferred_languages: selectedLanguages,
        });

      if (queueError) throw queueError;

      // Look for a match
      const { data: potentialMatches, error: matchError } = await supabase
        .from("matching_queue")
        .select("*")
        .neq("user_id", currentUser.id)
        .limit(1);

      if (matchError) throw matchError;

      if (potentialMatches && potentialMatches.length > 0) {
        // Found a match! Create session via edge function
        const match = potentialMatches[0];

        const { data: { session }, error: sessionError } = await supabase.functions.invoke(
          'create-session',
          {
            body: { matchUserId: match.user_id }
          }
        );

        if (sessionError) throw sessionError;

        toast({
          title: "Match Found!",
          description: "Connecting you to your coding partner...",
        });

        // Navigate to session
        navigate(`/session/${session.id}`);
      } else {
        // No match yet, wait for someone
        toast({
          title: "Searching for Match",
          description: "Waiting for another developer to join...",
        });

        // Subscribe to queue changes
        const channel = supabase
          .channel("matching_queue_changes")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "matching_queue",
            },
            async () => {
              // Someone joined, try matching again
              setTimeout(() => findMatch(), 1000);
            }
          )
          .subscribe();

        // Cleanup after 30 seconds
        setTimeout(() => {
          channel.unsubscribe();
          setIsSearching(false);
          supabase
            .from("matching_queue")
            .delete()
            .eq("user_id", currentUser.id);
        }, 30000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to find a match. Please try again.",
        variant: "destructive",
      });
      setIsSearching(false);
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-primary glow-secondary mb-4">
              <Shuffle className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold text-gradient">Random Match</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get paired with developers worldwide. Code together and learn from each other.
            </p>
          </div>

          <Card className="card-glass p-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-foreground">Set Your Preferences</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Skill Level</label>
                <div className="flex flex-wrap gap-2">
                  {levels.map((level) => (
                    <Badge
                      key={level}
                      variant={selectedLevel === level ? "default" : "outline"}
                      className={`cursor-pointer transition-all px-4 py-2 ${
                        selectedLevel === level
                          ? "bg-primary border-primary"
                          : "hover:bg-primary/20 hover:border-primary"
                      }`}
                      onClick={() => setSelectedLevel(level as "Beginner" | "Intermediate" | "Advanced")}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Programming Languages</label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant={selectedLanguages.includes(skill) ? "default" : "outline"}
                      className={`cursor-pointer transition-all px-4 py-2 ${
                        selectedLanguages.includes(skill)
                          ? "bg-secondary border-secondary"
                          : "hover:bg-secondary/20 hover:border-secondary"
                      }`}
                      onClick={() => toggleLanguage(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg bg-gradient-to-r from-secondary to-primary hover:opacity-90 transition-opacity"
              size="lg"
              onClick={findMatch}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 w-6 h-6 animate-spin" />
                  Searching for Match...
                </>
              ) : (
                <>
                  <Shuffle className="mr-2 w-6 h-6" />
                  Find a Match
                </>
              )}
            </Button>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Video Chat</h4>
              <p className="text-sm text-muted-foreground">
                Built-in video calling to discuss code and collaborate face-to-face
              </p>
            </Card>

            <Card className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center glow-secondary">
                <Code className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Shared Editor</h4>
              <p className="text-sm text-muted-foreground">
                Code together in real-time with syntax highlighting and auto-complete
              </p>
            </Card>

            <Card className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Global Network</h4>
              <p className="text-sm text-muted-foreground">
                Connect with developers from around the world and expand your network
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomMatch;
