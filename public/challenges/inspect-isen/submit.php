<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Soumettre le Flag - CTF ISEN</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #e31937;
            border-radius: 20px;
            padding: 50px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 0 50px rgba(227, 25, 55, 0.3);
        }

        .logo {
            margin-bottom: 30px;
        }

        .logo img {
            height: 60px;
        }

        h1 {
            color: #e31937;
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 0 20px rgba(227, 25, 55, 0.5);
        }

        .subtitle {
            color: #888;
            margin-bottom: 40px;
            font-size: 1.1rem;
        }

        .instructions {
            background: rgba(227, 25, 55, 0.1);
            border: 1px solid rgba(227, 25, 55, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: left;
        }

        .instructions h3 {
            color: #e31937;
            margin-bottom: 15px;
            font-size: 1.2rem;
        }

        .instructions p {
            color: #ccc;
            line-height: 1.8;
            font-size: 0.95rem;
        }

        .instructions code {
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 8px;
            border-radius: 4px;
            color: #00ff88;
            font-family: 'Courier New', monospace;
        }

        .input-group {
            margin-bottom: 25px;
        }

        .input-group label {
            display: block;
            color: #ccc;
            margin-bottom: 10px;
            font-size: 1rem;
            text-align: left;
        }

        .flag-input {
            width: 100%;
            padding: 18px 25px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(227, 25, 55, 0.5);
            border-radius: 15px;
            color: white;
            font-size: 1.1rem;
            font-family: 'Courier New', monospace;
            transition: all 0.3s ease;
        }

        .flag-input:focus {
            outline: none;
            border-color: #e31937;
            box-shadow: 0 0 20px rgba(227, 25, 55, 0.3);
            background: rgba(255, 255, 255, 0.08);
        }

        .flag-input::placeholder {
            color: #666;
        }

        .submit-btn {
            background: linear-gradient(135deg, #e31937 0%, #c41530 100%);
            color: white;
            padding: 18px 50px;
            border: none;
            border-radius: 15px;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 2px;
            width: 100%;
        }

        .submit-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(227, 25, 55, 0.4);
        }

        .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .status {
            margin-top: 25px;
            padding: 15px;
            border-radius: 10px;
            font-weight: bold;
            display: none;
        }

        .status.success {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            color: #00ff88;
            display: block;
        }

        .status.error {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff4444;
            color: #ff4444;
            display: block;
        }

        .status.warning {
            background: rgba(255, 200, 0, 0.1);
            border: 1px solid #ffc800;
            color: #ffc800;
            display: block;
        }

        .back-btn {
            margin-top: 30px;
            display: inline-block;
            color: #888;
            text-decoration: none;
            font-size: 0.95rem;
            transition: color 0.3s;
        }

        .back-btn:hover {
            color: #e31937;
        }

        .confetti {
            position: fixed;
            width: 10px;
            height: 10px;
            pointer-events: none;
            animation: confetti-fall 3s ease-out forwards;
        }

        @keyframes confetti-fall {
            0% {
                opacity: 1;
                transform: translateY(0) rotate(0deg);
            }
            100% {
                opacity: 0;
                transform: translateY(100vh) rotate(720deg);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="ISEN-logo2-Q3.png" alt="ISEN Logo">
        </div>
        
        <h1>🚩 Soumettre le Flag</h1>
        <p class="subtitle">Challenge Web - Inspection de code</p>

        <div class="instructions">
            <h3>💡 Indice</h3>
            <p>
                As-tu bien regardé <strong>tout</strong> le contenu de la page ? 
                Parfois, les secrets sont cachés là où on ne les voit pas directement...
                <br><br>
                Conseil : Utilise les <code>outils de développement</code> de ton navigateur !
            </p>
        </div>

        <div class="input-group">
            <label for="flagInput">Entre le flag que tu as trouvé :</label>
            <input 
                type="text" 
                id="flagInput" 
                class="flag-input" 
                placeholder="FLAG_ISEN{...}"
                autocomplete="off"
            >
        </div>

        <button class="submit-btn" id="submitBtn" onclick="validateFlag()">
            Valider le Flag
        </button>

        <div id="status" class="status"></div>

        <a href="index.php?<?php echo $_SERVER['QUERY_STRING']; ?>" class="back-btn">← Retour au site ISEN</a>
    </div>

    <script>
        // Configuration CTF
        const urlParams = new URLSearchParams(window.location.search);
        const CONFIG = {
            // Accepte challengeId OU challenge comme paramètre
            challengeId: urlParams.get('challengeId') || urlParams.get('challenge'),
            ctfUrl: 'https://jpo-bachelor-cyber-isen.lovable.app',
            supabaseUrl: 'https://qjwzplhclyjefueswncx.supabase.co',
            supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd3pwbGhjbHlqZWZ1ZXN3bmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzA0NjYsImV4cCI6MjA4MTQ0NjQ2Nn0.VzoX79TA7sTST_y1g6nlTLJjrWEAmrmeESFbunG3iik'
        };

        // Récupérer les infos de session depuis l'URL (priorité) ou localStorage
        function getSessionInfo() {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Priorité aux paramètres URL (passés par le CTF)
            let sessionId = urlParams.get('sessionId');
            let pseudo = urlParams.get('pseudo');
            
            // Fallback sur localStorage si pas dans l'URL
            if (!sessionId) {
                sessionId = localStorage.getItem('ctf_session_id');
            }
            if (!pseudo) {
                pseudo = localStorage.getItem('ctf_pseudo');
            }
            
            // Générer un nouveau sessionId si toujours pas disponible
            if (!sessionId) {
                sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('ctf_session_id', sessionId);
            }
            
            return { sessionId, pseudo };
        }

        async function validateFlag() {
            const flagInput = document.getElementById('flagInput');
            const submitBtn = document.getElementById('submitBtn');
            const status = document.getElementById('status');
            const submittedFlag = flagInput.value.trim();

            // Validation basique
            if (!submittedFlag) {
                status.className = 'status error';
                status.textContent = '❌ Entre un flag avant de valider !';
                return;
            }

            // Vérifier que le challengeId est présent
            if (!CONFIG.challengeId) {
                status.className = 'status warning';
                status.textContent = '⚠️ ID du challenge manquant. Accède à ce challenge depuis la plateforme CTF.';
                return;
            }

            // Récupérer les infos de session
            const { sessionId, pseudo } = getSessionInfo();

            if (!pseudo) {
                status.className = 'status warning';
                status.textContent = '⚠️ Pseudo manquant. Retourne sur la plateforme CTF et accède au challenge depuis là-bas.';
                return;
            }

            // Désactiver le bouton pendant la requête
            submitBtn.disabled = true;
            submitBtn.textContent = 'Vérification...';
            status.className = 'status';
            status.style.display = 'none';

            try {
                // Appel à l'Edge Function record-external-submission
                const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/record-external-submission`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': CONFIG.supabaseAnonKey,
                        'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        challengeId: CONFIG.challengeId,
                        submittedFlag: submittedFlag,
                        sessionId: sessionId,
                        pseudo: pseudo
                    })
                });

                const result = await response.json();

                if (result.success) {
                    status.className = 'status success';
                    status.textContent = `🎉 ${result.message}`;
                    createConfetti();
                    
                    // Proposer de retourner au CTF après 3 secondes
                    setTimeout(() => {
                        if (confirm('Bravo ! Veux-tu retourner à la plateforme CTF ?')) {
                            window.location.href = CONFIG.ctfUrl + '/arena';
                        }
                    }, 2000);
                } else {
                    status.className = 'status error';
                    status.textContent = `❌ ${result.message || 'Flag incorrect. Réessaie !'}`;
                }
            } catch (error) {
                console.error('Erreur:', error);
                status.className = 'status error';
                status.textContent = '❌ Erreur de connexion au serveur. Vérifie ta connexion internet.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Valider le Flag';
            }
        }

        // Confetti pour célébrer
        function createConfetti() {
            const colors = ['#e31937', '#00ff88', '#ffc800', '#00aaff', '#ff44aa'];
            for (let i = 0; i < 100; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * 100 + 'vw';
                    confetti.style.top = '-10px';
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                    document.body.appendChild(confetti);
                    
                    setTimeout(() => confetti.remove(), 3000);
                }, i * 30);
            }
        }

        // Soumettre avec Enter
        document.getElementById('flagInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validateFlag();
            }
        });

        // Vérifier au chargement si les paramètres sont présents
        window.addEventListener('load', function() {
            const { sessionId, pseudo } = getSessionInfo();
            
            if (!CONFIG.challengeId) {
                document.getElementById('status').className = 'status warning';
                document.getElementById('status').textContent = '⚠️ Accède à ce challenge depuis la plateforme CTF pour que tes points soient comptabilisés.';
            } else if (!pseudo) {
                document.getElementById('status').className = 'status warning';
                document.getElementById('status').textContent = '⚠️ Pseudo manquant. Retourne sur la plateforme CTF.';
            }
        });
    </script>
</body>
</html>
