<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Je veux le flag</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
        }

        .button {
            background-color: #FF3333;
            color: white;
            padding: 25px 60px;
            font-size: 24px;
            font-weight: bold;
            border: 4px solid white;
            border-radius: 50px;
            cursor: pointer;
            transform: rotate(-20deg);
            box-shadow: 0 10px 30px rgba(255, 51, 51, 0.3);
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .button:hover {
            background-color: #FF4444;
            transform: rotate(-20deg) scale(1.05);
            box-shadow: 0 15px 40px rgba(255, 51, 51, 0.5);
        }

        .button:active {
            transform: rotate(-20deg) scale(0.98);
        }
    </style>
</head>
<body>
    <form method="POST">
        <button class="button" type="submit" name="getFlag" disabled="true">JE VEUX LE FLAG</button>
    </form>
    
    <?php
    if (isset($_POST['getFlag'])) {
        header('Location: my-suuuuuuuuuuper-flag-i-dont-know.php' . '?' . $_SERVER['QUERY_STRING']);
        exit();
    }
    ?>
</body>
</html>
