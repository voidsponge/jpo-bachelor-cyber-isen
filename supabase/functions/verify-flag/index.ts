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

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      // Try to authenticate using the JWT token
      try {
        const { data, error: authError } = await supabaseClient.auth.getUser(token);
        if (authError) {
          console.log('Auth error:', authError.message);
        } else if (data?.user) {
          userId = data.user.id;
          console.log('Authenticated user:', userId);
        }
      } catch (e) {
        console.error('Auth exception:', e);
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
      .select('id, flag, points, title, is_active, is_terminal_challenge, external_url, docker_image')
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
    let isCorrect = false;
    
    // If challenge has docker_image, verify via Docker API
    if (challenge.docker_image) {
      try {
        // Docker API server URL - adjust based on your setup
        const dockerApiUrl = Deno.env.get('DOCKER_API_URL') || 'http://192.168.240.201:3001';
        const dockerApiSecret = Deno.env.get('DOCKER_API_SECRET') || '';
        
        console.log(`Verifying flag via Docker API for session ${sessionId}`);
        
        const dockerResponse = await fetch(`${dockerApiUrl}/api/container/verify-flag`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Secret': dockerApiSecret
          },
          body: JSON.stringify({ 
            sessionId: sessionId,
            submittedFlag: submittedFlag.trim() 
          })
        });
        
        if (!dockerResponse.ok) {
          const errorData = await dockerResponse.json().catch(() => ({}));
          console.error(`Docker API error: ${dockerResponse.status}`, errorData);
          
          if (errorData.error?.includes('No container running')) {
            return new Response(
              JSON.stringify({ error: 'Aucun conteneur actif. Lance le challenge d\'abord !' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: 'Erreur de vérification Docker' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const dockerResult = await dockerResponse.json();
        isCorrect = dockerResult.valid === true;
        console.log(`Docker API response: valid=${isCorrect}`);
        
      } catch (apiError) {
        console.error('Docker API call failed:', apiError);
        return new Response(
          JSON.stringify({ error: 'Service Docker indisponible' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // If challenge has external_url, verify via external API
    else if (challenge.external_url) {
      try {
        const apiUrl = challenge.external_url.endsWith('/') 
          ? `${challenge.external_url}api/verify` 
          : `${challenge.external_url}/api/verify`;
        
        console.log(`Calling external API: ${apiUrl}`);
        
        const externalResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flag: submittedFlag.trim() })
        });
        
        if (!externalResponse.ok) {
          console.error(`External API error: ${externalResponse.status}`);
          return new Response(
            JSON.stringify({ error: 'Erreur de vérification externe' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const externalResult = await externalResponse.json();
        isCorrect = externalResult.valid === true;
        console.log(`External API response: valid=${isCorrect}`);
        
      } catch (apiError) {
        console.error('External API call failed:', apiError);
        return new Response(
          JSON.stringify({ error: 'Service externe indisponible' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // For terminal challenges, accept any valid dynamic flag format
    else if (isTerminalChallenge && terminalFlagPattern.test(submittedFlag.trim())) {
      isCorrect = true;
    }
    // For regular challenges, compare against the database flag
    else {
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