import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { challengeId, submittedFlag, sessionId, pseudo } = await req.json();

    if (!challengeId || !submittedFlag) {
      return new Response(
        JSON.stringify({ error: 'Challenge ID et flag requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    if (typeof submittedFlag !== 'string' || submittedFlag.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Flag invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if authenticated user or anonymous player
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let playerId: string | null = null;

    if (authHeader) {
      // Try to authenticate
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!authError && user) {
        userId = user.id;
      }
    }

    // If not authenticated, handle anonymous player
    if (!userId) {
      if (!sessionId || !pseudo) {
        return new Response(
          JSON.stringify({ error: 'Session ID et pseudo requis pour les joueurs anonymes' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate pseudo
      if (typeof pseudo !== 'string' || pseudo.length < 2 || pseudo.length > 30) {
        return new Response(
          JSON.stringify({ error: 'Pseudo invalide (2-30 caractères)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get or create player
      const { data: existingPlayer } = await supabaseClient
        .from('players')
        .select('id, pseudo')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingPlayer) {
        playerId = existingPlayer.id;
        // Update pseudo if changed
        if (existingPlayer.pseudo !== pseudo) {
          await supabaseClient
            .from('players')
            .update({ pseudo })
            .eq('id', existingPlayer.id);
        }
      } else {
        // Create new player
        const { data: newPlayer, error: createError } = await supabaseClient
          .from('players')
          .insert({ session_id: sessionId, pseudo })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
          return new Response(
            JSON.stringify({ error: 'Erreur lors de la création du joueur' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        playerId = newPlayer.id;
      }
    }

    const identifier = userId || playerId;
    const identifierType = userId ? 'user' : 'player';
    console.log(`${identifierType} ${identifier} submitting flag for challenge ${challengeId}`);

    // Get the challenge's correct flag (server-side only!)
    const { data: challenge, error: challengeError } = await supabaseClient
      .from('challenges')
      .select('id, flag, points, title, is_active, is_terminal_challenge')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      console.error('Challenge error:', challengeError);
      return new Response(
        JSON.stringify({ error: 'Challenge non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!challenge.is_active) {
      return new Response(
        JSON.stringify({ error: 'Ce challenge n\'est pas actif' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a terminal challenge with dynamic flag
    const isTerminalChallenge = challenge.is_terminal_challenge || false;
    const terminalFlagPattern = /^ISEN\{L1NUX_M4ST3R_[A-Z0-9]{8}\}$/i;

    // Check if already solved
    let existingQuery = supabaseClient
      .from('submissions')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('is_correct', true);

    if (userId) {
      existingQuery = existingQuery.eq('user_id', userId);
    } else {
      existingQuery = existingQuery.eq('player_id', playerId);
    }

    const { data: existingSubmission } = await existingQuery.maybeSingle();

    if (existingSubmission) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Tu as déjà résolu ce challenge !',
          alreadySolved: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compare flags
    // For terminal challenges, accept any valid dynamic flag format
    // For regular challenges, compare against the database flag
    let isCorrect = false;
    if (isTerminalChallenge && terminalFlagPattern.test(submittedFlag.trim())) {
      isCorrect = true;
    } else {
      isCorrect = submittedFlag.trim().toLowerCase() === challenge.flag.toLowerCase();
    }

    // Record the submission
    const submissionData: any = {
      challenge_id: challengeId,
      submitted_flag: submittedFlag.substring(0, 200),
      is_correct: isCorrect
    };

    if (userId) {
      submissionData.user_id = userId;
    } else {
      submissionData.player_id = playerId;
    }

    const { error: submissionError } = await supabaseClient
      .from('submissions')
      .insert(submissionData);

    if (submissionError) {
      console.error('Submission error:', submissionError);
      if (submissionError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Tu as déjà résolu ce challenge !',
            alreadySolved: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (isCorrect) {
      console.log(`${identifierType} ${identifier} solved challenge ${challengeId} - ${challenge.title}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `🎉 Bravo ! +${challenge.points} points`,
          points: challenge.points,
          challengeTitle: challenge.title,
          playerId: playerId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`${identifierType} ${identifier} failed attempt on challenge ${challengeId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Flag incorrect. Essaie encore !'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in verify-flag function:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});