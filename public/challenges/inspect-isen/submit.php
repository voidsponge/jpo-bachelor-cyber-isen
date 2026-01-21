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
        // Basé sur le template "button-redirect" (même logique d'identité + remontée)
        const urlParams = new URLSearchParams(window.location.search);

        const CONFIG = {
            // Accepte challengeId (standard) OU challenge (fallback)
            challengeId: urlParams.get('challengeId') || urlParams.get('challenge') || '',
            ctfUrl: 'https://jpo-bachelor-cyber-isen.lovable.app',
            supabaseUrl: 'https://qjwzplhclyjefueswncx.supabase.co',
            supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd3pwbGhjbHlqZWZ1ZXN3bmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzA0NjYsImV4cCI6MjA4MTQ0NjQ2Nn0.VzoX79TA7sTST_y1g6nlTLJjrWEAmrmeESFbunG3iik',
        };

        function getSessionInfo() {
            let sessionId = urlParams.get('sessionId');
            let pseudo = urlParams.get('pseudo');

            if (!sessionId) {
                sessionId = localStorage.getItem('ctf_session_id');
                if (!sessionId) {
                    sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('ctf_session_id', sessionId);
                }
            }

            if (!pseudo) {
                pseudo = localStorage.getItem('playerPseudo') || localStorage.getItem('ctf_pseudo') || 'Anonyme';
            }

            return { sessionId, pseudo };
        }

        const { sessionId, pseudo } = getSessionInfo();

        async function validateFlag() {
            const flagInputEl = document.getElementById('flagInput');
            const submitBtn = document.getElementById('submitBtn');
            const statusEl = document.getElementById('status');

            const submittedFlag = flagInputEl.value.trim();

            if (!submittedFlag) {
                statusEl.className = 'status error';
                statusEl.textContent = '❌ Veuillez entrer le flag';
                return;
            }

            if (!CONFIG.challengeId) {
                statusEl.className = 'status warning';
                statusEl.textContent = '⚠️ ID du challenge manquant dans l\'URL';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Validation...';

            try {
                const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/record-external-submission`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`,
                    },
                    body: JSON.stringify({
                        challengeId: CONFIG.challengeId,
                        submittedFlag,
                        sessionId,
                        pseudo,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    statusEl.className = 'status success';
                    statusEl.textContent = `🎉 ${result.message} (+${result.points ?? 0} points)`;
                    submitBtn.textContent = '✓ Validé !';
                    createConfetti();
                } else {
                    statusEl.className = 'status error';
                    statusEl.textContent = `❌ ${result.message || 'Flag incorrect'}`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Valider le Flag';
                }
            } catch (error) {
                console.error('Erreur:', error);
                statusEl.className = 'status error';
                statusEl.textContent = '❌ Erreur de connexion au serveur CTF';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Valider le Flag';
            }
        }

        function createConfetti() {
            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${['#dc2626', '#22c55e', '#3b82f6', '#eab308', '#ec4899'][Math.floor(Math.random() * 5)]};
                    left: ${Math.random() * 100}vw;
                    top: -10px;
                    border-radius: 50%;
                    pointer-events: none;
                    animation: fall ${2 + Math.random() * 2}s linear forwards;
                `;
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 4000);
            }

            if (!document.getElementById('confettiStyle')) {
                const style = document.createElement('style');
                style.id = 'confettiStyle';
                style.textContent = `
                    @keyframes fall {
                        to {
                            transform: translateY(100vh) rotate(720deg);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        document.getElementById('flagInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') validateFlag();
        });
    </script>
</body>
</html>
