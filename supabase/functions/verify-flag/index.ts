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
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { challengeId, submittedFlag } = await req.json();

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

    console.log(`User ${user.id} submitting flag for challenge ${challengeId}`);

    // Get the challenge's correct flag (server-side only!)
    const { data: challenge, error: challengeError } = await supabaseClient
      .from('challenges')
      .select('id, flag, points, title, is_active')
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

    // Check if already solved
    const { data: existingSubmission } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .eq('is_correct', true)
      .maybeSingle();

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

    // Compare flags (case-insensitive)
    const isCorrect = submittedFlag.trim().toLowerCase() === challenge.flag.toLowerCase();

    // Record the submission
    const { error: submissionError } = await supabaseClient
      .from('submissions')
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        submitted_flag: submittedFlag.substring(0, 200), // Limit stored length
        is_correct: isCorrect
      });

    if (submissionError) {
      console.error('Submission error:', submissionError);
      // If it's a unique constraint error, the user already has a correct submission
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
      console.log(`User ${user.id} solved challenge ${challengeId} - ${challenge.title}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `🎉 Bravo ! +${challenge.points} points`,
          points: challenge.points,
          challengeTitle: challenge.title
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`User ${user.id} failed attempt on challenge ${challengeId}`);
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
