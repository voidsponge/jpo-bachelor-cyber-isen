<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flag Trouvé!</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 20px;
            background-color: #0a0a0a;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #fff;
        }

        .container {
            max-width: 600px;
            width: 100%;
            text-align: center;
        }

        .logo {
            width: 120px;
            margin-bottom: 20px;
        }

        h1 {
            color: #dc2626;
            font-size: 28px;
            margin-bottom: 10px;
        }

        .flag-display {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #dc2626;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            color: #22c55e;
            word-break: break-all;
            text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }

        .instructions {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }

        .instructions h3 {
            color: #dc2626;
            margin-top: 0;
        }

        .instructions ol {
            padding-left: 20px;
            line-height: 1.8;
        }

        .submit-section {
            background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 25px;
            margin-top: 20px;
        }

        .submit-section h3 {
            color: #dc2626;
            margin-top: 0;
        }

        .input-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        input[type="text"] {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #333;
            border-radius: 8px;
            background: #0a0a0a;
            color: #fff;
            font-size: 16px;
            font-family: 'Courier New', monospace;
        }

        input[type="text"]:focus {
            outline: none;
            border-color: #dc2626;
        }

        .submit-btn {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(220, 38, 38, 0.4);
        }

        .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .status {
            margin-top: 15px;
            padding: 12px;
            border-radius: 8px;
            display: none;
        }

        .status.success {
            display: block;
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid #22c55e;
            color: #22c55e;
        }

        .status.error {
            display: block;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid #ef4444;
            color: #ef4444;
        }

        .back-btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: transparent;
            border: 2px solid #dc2626;
            color: #dc2626;
            border-radius: 8px;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .back-btn:hover {
            background: #dc2626;
            color: white;
        }

        .player-info {
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            border-radius: 8px;
            padding: 10px 15px;
            margin-bottom: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://jpo-bachelor-cyber-isen.lovable.app/lovable-uploads/cf76aca7-8a99-4b68-90c0-85a491f297ed.png" alt="ISEN Logo" class="logo" onerror="this.style.display='none'">
        
        <h1>🎉 Bravo ! Tu as trouvé le flag !</h1>
        
        <div id="playerInfo" class="player-info" style="display: none;">
            Joueur: <span id="playerPseudo">-</span>
        </div>

        <?php
            $file = '/FLAG-GEN/flag';
            $flagContent = '';

            if (file_exists($file)) {
                $flagContent = trim(file_get_contents($file));
                echo "<div class='flag-display' id='flagValue'>$flagContent</div>";
            } else {
                echo "<div class='flag-display' style='color: #ef4444;'>Erreur: Flag non trouvé</div>";
            }
        ?>

        <div class="instructions">
            <h3>📋 Instructions</h3>
            <ol>
                <li>Copie le flag affiché ci-dessus</li>
                <li>Colle-le dans le champ de soumission ci-dessous</li>
                <li>Clique sur "Valider" pour gagner tes points !</li>
            </ol>
        </div>

        <div class="submit-section">
            <h3>🚩 Soumettre le Flag</h3>
            <div class="input-group">
                <input type="text" id="flagInput" placeholder="Colle le flag ici..." autocomplete="off">
                <button class="submit-btn" id="submitBtn" onclick="validateFlag()">Valider</button>
            </div>
            <div id="status" class="status"></div>
        </div>

        <a href="#" id="backLink" class="back-btn" onclick="backToCTF()">← Retour au CTF</a>
    </div>

    <script>
        // Configuration - À MODIFIER avec les vraies valeurs
        const CONFIG = {
            // ID du challenge dans Supabase (à récupérer depuis l'admin)
            challengeId: new URLSearchParams(window.location.search).get('challengeId') || '',
            // URL de base du CTF
            ctfUrl: 'https://jpo-bachelor-cyber-isen.lovable.app',
            // Endpoint Supabase
            supabaseUrl: 'https://qjwzplhclyjefueswncx.supabase.co',
            supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd3pwbGhjbHlqZWZ1ZXN3bmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzA0NjYsImV4cCI6MjA4MTQ0NjQ2Nn0.VzoX79TA7sTST_y1g6nlTLJjrWEAmrmeESFbunG3iik'
        };

        // Récupérer les infos de session depuis les paramètres URL (prioritaire) ou localStorage
        function getSessionInfo() {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Priorité aux paramètres URL (passés depuis le CTF)
            let sessionId = urlParams.get('sessionId');
            let pseudo = urlParams.get('pseudo');
            
            // Fallback sur localStorage si pas de paramètres URL
            if (!sessionId) {
                sessionId = localStorage.getItem('ctf_session_id');
                if (!sessionId) {
                    sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('ctf_session_id', sessionId);
                }
            }
            
            if (!pseudo) {
                pseudo = localStorage.getItem('playerPseudo') || 'Anonyme';
            }
            
            return { sessionId, pseudo };
        }

        // Initialisation
        const { sessionId, pseudo } = getSessionInfo();
        
        // Afficher les infos du joueur
        if (pseudo && pseudo !== 'Anonyme') {
            document.getElementById('playerInfo').style.display = 'block';
            document.getElementById('playerPseudo').textContent = pseudo;
        }

        // Fonction de validation du flag
        async function validateFlag() {
            const flagInput = document.getElementById('flagInput').value.trim();
            const statusEl = document.getElementById('status');
            const submitBtn = document.getElementById('submitBtn');

            if (!flagInput) {
                statusEl.className = 'status error';
                statusEl.textContent = '❌ Veuillez entrer le flag';
                return;
            }

            if (!CONFIG.challengeId) {
                statusEl.className = 'status error';
                statusEl.textContent = '❌ Erreur: ID du challenge manquant dans l\'URL';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Validation...';

            try {
                const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/record-external-submission`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        challengeId: CONFIG.challengeId,
                        submittedFlag: flagInput,
                        sessionId: sessionId,
                        pseudo: pseudo
                    })
                });

                const result = await response.json();

                if (result.success) {
                    statusEl.className = 'status success';
                    statusEl.textContent = `🎉 ${result.message} (+${result.points} points)`;
                    submitBtn.textContent = '✓ Validé !';
                    
                    // Confetti effect
                    createConfetti();
                } else {
                    statusEl.className = 'status error';
                    statusEl.textContent = `❌ ${result.message || 'Flag incorrect'}`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Valider';
                }
            } catch (error) {
                console.error('Erreur:', error);
                statusEl.className = 'status error';
                statusEl.textContent = '❌ Erreur de connexion au serveur CTF';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Valider';
            }
        }

        // Retour au CTF
        function backToCTF() {
            window.location.href = CONFIG.ctfUrl + '/arena';
        }

        // Mini confetti effect
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

        // Validation avec Enter
        document.getElementById('flagInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') validateFlag();
        });
    </script>
</body>
</html>
