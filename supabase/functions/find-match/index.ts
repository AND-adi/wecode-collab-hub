import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for elevated privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { skillLevel, preferredLanguages } = await req.json();

    if (!skillLevel || !preferredLanguages || !Array.isArray(preferredLanguages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: skillLevel and preferredLanguages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} searching for match with level: ${skillLevel}, languages:`, preferredLanguages);

    // Add user to matching queue using service role
    const { error: queueError } = await supabase
      .from('matching_queue')
      .insert({
        user_id: user.id,
        skill_level: skillLevel,
        preferred_languages: preferredLanguages,
      });

    if (queueError) {
      console.error('Queue insertion error:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to join matching queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look for potential matches (excluding current user)
    // Using service role to bypass RLS and find matches
    const { data: potentialMatches, error: matchError } = await supabase
      .from('matching_queue')
      .select('*')
      .neq('user_id', user.id)
      .limit(10);

    if (matchError) {
      console.error('Match query error:', matchError);
      return new Response(
        JSON.stringify({ error: 'Failed to search for matches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find best match based on skill level and language overlap
    let bestMatch = null;
    let maxScore = 0;

    if (potentialMatches && potentialMatches.length > 0) {
      for (const candidate of potentialMatches) {
        let score = 0;

        // Same skill level bonus
        if (candidate.skill_level === skillLevel) {
          score += 10;
        }

        // Language overlap bonus
        const languageOverlap = preferredLanguages.filter((lang: string) =>
          candidate.preferred_languages.includes(lang)
        ).length;
        score += languageOverlap * 5;

        if (score > maxScore) {
          maxScore = score;
          bestMatch = candidate;
        }
      }
    }

    if (bestMatch) {
      console.log(`Match found for user ${user.id} with user ${bestMatch.user_id}`);
      
      // Return only the match user ID, not full queue details
      return new Response(
        JSON.stringify({ 
          matched: true, 
          matchUserId: bestMatch.user_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No match found yet
    console.log(`No match found for user ${user.id}, waiting in queue`);
    return new Response(
      JSON.stringify({ matched: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in find-match:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});