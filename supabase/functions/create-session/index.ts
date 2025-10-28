import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const RATE_LIMIT_SESSIONS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { data: recentSessions, error: countError } = await supabase
      .from('session_participants')
      .select('session_id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('joined_at', oneHourAgo);

    if (countError) {
      console.error('Rate limit check error:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (recentSessions && recentSessions.length >= RATE_LIMIT_SESSIONS_PER_HOUR) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `You can only create ${RATE_LIMIT_SESSIONS_PER_HOUR} sessions per hour. Please try again later.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { matchUserId } = await req.json();

    if (!matchUserId) {
      return new Response(
        JSON.stringify({ error: 'Match user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('coding_sessions')
      .insert({ status: 'active' })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add both participants
    const { error: participantsError } = await supabase
      .from('session_participants')
      .insert([
        { session_id: session.id, user_id: user.id },
        { session_id: session.id, user_id: matchUserId },
      ]);

    if (participantsError) {
      console.error('Participants error:', participantsError);
      // Cleanup session if participants failed
      await supabase.from('coding_sessions').delete().eq('id', session.id);
      return new Response(
        JSON.stringify({ error: 'Failed to add participants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove both from queue
    await supabase
      .from('matching_queue')
      .delete()
      .in('user_id', [user.id, matchUserId]);

    return new Response(
      JSON.stringify({ session }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
