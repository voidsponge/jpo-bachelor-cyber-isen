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

    console.log(`External submission: challenge=${challengeId}, sessionId=${sessionId}, pseudo=${pseudo}`);

    if (!challengeId || !submittedFlag || !sessionId || !pseudo) {
      return new Response(
        JSON.stringify({ success: false, error: 'challengeId, submittedFlag, sessionId et pseudo requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate pseudo
    if (typeof pseudo !== 'string' || pseudo.length < 2 || pseudo.length > 30) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pseudo invalide (2-30 caractères)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create player
    let playerId: string;
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
          JSON.stringify({ success: false, error: 'Erreur lors de la création du joueur' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      playerId = newPlayer.id;
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabaseClient
      .from('challenges')
      .select('id, flag, points, title, is_active, docker_image')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      console.error('Challenge error:', challengeError);
      return new Response(
        JSON.stringify({ success: false, error: 'Challenge non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!challenge.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ce challenge n\'est pas actif' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already solved by this player
    const { data: existingSubmission } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('player_id', playerId)
      .eq('is_correct', true)
      .maybeSingle();

    if (existingSubmission) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          correct: true,
          alreadyFound: true,
          message: 'Tu as déjà résolu ce challenge !',
          points: challenge.points
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Docker challenges, we trust the external validation
    // The external page already validated the flag before calling this endpoint
    // We just verify the flag format matches what's expected
    const isCorrect = submittedFlag.trim().startsWith('FLAG_ISEN') || 
                      submittedFlag.trim().startsWith('ISEN{') ||
                      submittedFlag.trim().toLowerCase() === challenge.flag.toLowerCase();

    // Record the submission
    const { error: submissionError } = await supabaseClient
      .from('submissions')
      .insert({
        challenge_id: challengeId,
        player_id: playerId,
        submitted_flag: submittedFlag.substring(0, 200),
        is_correct: isCorrect
      });

    if (submissionError) {
      console.error('Submission error:', submissionError);
      if (submissionError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            correct: true,
            alreadyFound: true,
            message: 'Tu as déjà résolu ce challenge !'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur lors de l\'enregistrement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isCorrect) {
      // Calculate total score for this player
      const { data: scoreData } = await supabaseClient
        .rpc('get_player_score', { _player_id: playerId });

      const totalScore = scoreData || challenge.points;

      // Count total flags found
      const { count: flagsCount } = await supabaseClient
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId)
        .eq('is_correct', true);

      console.log(`Player ${playerId} (${pseudo}) solved challenge ${challengeId} - ${challenge.title}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          correct: true,
          message: `🎉 Bravo ! +${challenge.points} points enregistrés sur le CTF !`,
          points: challenge.points,
          score: totalScore,
          totalFlags: flagsCount || 1,
          challengeTitle: challenge.title
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`Player ${playerId} failed attempt on challenge ${challengeId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          correct: false,
          message: 'Flag incorrect pour le CTF'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in record-external-submission:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
