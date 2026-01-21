<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ISEN Méditerranée - L'école des ingénieurs du numérique</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            overflow-x: hidden;
        }

        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 51, 120, 0.95);
            padding: 15px 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1000;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .nav-menu {
            display: flex;
            gap: 30px;
            align-items: center;
        }

        .nav-menu a {
            color: white;
            text-decoration: none;
            font-size: 14px;
            transition: opacity 0.3s;
        }

        .nav-menu a:hover {
            opacity: 0.8;
        }

        .btn-contact {
            background: #e31937;
            color: white;
            padding: 10px 25px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            transition: background 0.3s;
        }

        .btn-contact:hover {
            background: #c41530;
        }

        .hero-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 100vh;
            margin-top: 70px;
        }

        .hero-left {
            background: linear-gradient(135deg, #003378 0%, #0055b8 100%);
            padding: 80px 60px;
            position: relative;
            overflow: hidden;
        }

        .hero-left::before {
            content: '';
            position: absolute;
            width: 600px;
            height: 600px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            top: -200px;
            right: -200px;
        }

        .hero-left::after {
            content: '';
            position: absolute;
            width: 800px;
            height: 800px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            bottom: -400px;
            left: -300px;
        }

        .content-wrapper {
            position: relative;
            z-index: 2;
        }

        .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin-bottom: 20px;
        }

        .main-title {
            color: white;
            font-size: 48px;
            line-height: 1.2;
            margin-bottom: 50px;
            font-weight: bold;
        }

        .form-group {
            margin-bottom: 25px;
        }

        .form-label {
            color: white;
            font-size: 16px;
            margin-bottom: 10px;
            display: block;
        }

        .form-select {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: transparent;
            color: white;
            border-radius: 30px;
            font-size: 14px;
            cursor: pointer;
            appearance: none;
        }

        .form-select option {
            background: #003378;
            color: white;
        }

        .btn-apply {
            background: white;
            color: #003378;
            padding: 15px 40px;
            border: none;
            border-radius: 30px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.3s;
            margin-top: 20px;
        }

        .btn-apply:hover {
            transform: scale(1.05);
        }

        .accreditation {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin-top: 40px;
        }

        .hero-right {
            position: relative;
            background-size: cover;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .image-placeholder {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .sidebar-buttons {
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 15px;
            z-index: 999;
        }

        .sidebar-btn {
            background: #e31937;
            color: white;
            padding: 15px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background 0.3s;
            text-align: center;
            text-decoration: none;
            display: block;
        }

        .sidebar-btn:hover {
            background: #c41530;
        }

        .sidebar-btn.blue {
            background: #003378;
        }

        .sidebar-btn.blue:hover {
            background: #002859;
        }

        .chat-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #e31937;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s;
        }

        .chat-button:hover {
            transform: scale(1.1);
        }

        .help-bubble {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: white;
            padding: 15px 20px;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font-size: 14px;
            max-width: 200px;
        }

        @media (max-width: 1024px) {
            .hero-section {
                grid-template-columns: 1fr;
            }

            .hero-right {
                min-height: 400px;
            }

            .main-title {
                font-size: 36px;
            }
        }
    </style>
</head>
<body>
<?php
    $file = '/FLAG-GEN/flag';

    if (file_exists($file)) {
        $content = file_get_contents($file);
        echo "<!--\n" . htmlspecialchars($content) . "\n-->";
    } else {
        echo "<!-- Un probleme est survenu -->";
    }
?>
    <header class="header">
        <div class="logo-section">
            <img src="ISEN-logo2-Q3.png" alt="ISEN Logo" style="height: 40px;">
        </div>
        <nav class="nav-menu">
            <a href="#ecole">L'école</a>
            <a href="#formations">Les formations</a>
            <a href="#vie">La vie étudiante</a>
            <a href="#international">L'international</a>
            <a href="#entreprises">Les entreprises</a>
            <a href="#recherche">La recherche</a>
            <a href="#actualites">Les actualités</a>
            <a href="#admissions" class="btn-contact">Rencontrez-nous</a>
        </nav>
    </header>

    <main class="hero-section">
        <div class="hero-left">
            <div class="content-wrapper">
                <p class="subtitle">L'école des ingénieurs du numérique</p>
                <h1 class="main-title">
                    Le numérique, la cybersécurité et l'intelligence artificielle au cœur des formations
                </h1>

                <form>
                    <div class="form-group">
                        <label class="form-label">Je suis</label>
                        <select class="form-select">
                            <option>— Veuillez choisir une option —</option>
                            <option>Lycéen</option>
                            <option>Étudiant</option>
                            <option>Professionnel</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Je veux</label>
                        <select class="form-select">
                            <option>— Veuillez choisir une option —</option>
                            <option>M'informer sur les formations</option>
                            <option>Candidater</option>
                            <option>Visiter l'école</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-apply">Appliquer</button>
                </form>

                <p class="accreditation">L'ISEN est accréditée par la CTI</p>
            </div>
        </div>

        <div class="hero-right">
            <img src="header-home-isen.jpg" alt="ISEN Students" class="image-placeholder">
        </div>
    </main>

    <div class="sidebar-buttons">
        <a href="#brochures" class="sidebar-btn">Brochures 📄</a>
        <a href="#candidature" class="sidebar-btn">Candidature 🔗</a>
        <a href="submit.php?<?php echo $_SERVER['QUERY_STRING']; ?>" class="sidebar-btn blue">Soumettre Flag 🚩</a>
    </div>

    <div class="help-bubble">
        Je peux aider à rechercher de l'information
    </div>

    <button class="chat-button">💬</button>
</body>
</html>
