from flask import Flask, jsonify, request
from flag_store import flag_store

app = Flask(__name__)


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "ok",
        "service": "CTF Discord Bot - Flag API",
        "endpoints": {
            "/flag/<discord_user_id>": "Récupérer le flag par Discord User ID",
            "/flag/pseudo/<pseudo>": "Récupérer le flag par pseudo",
            "/flag/session/<session_id>": "Récupérer le flag par session ID",
            "/flags": "Lister tous les flags générés",
        },
    })


@app.route("/flag/<discord_user_id>", methods=["GET"])
def get_flag_by_discord_id(discord_user_id):
    entry = flag_store.get_by_discord_id(discord_user_id)
    if not entry:
        return jsonify({"error": "Aucun flag trouvé pour cet utilisateur Discord"}), 404
    return jsonify({
        "pseudo": entry["pseudo"],
        "session_id": entry["session_id"],
        "flag": entry["flag"],
        "generated_at": entry.get("generated_at"),
    })


@app.route("/flag/pseudo/<pseudo>", methods=["GET"])
def get_flag_by_pseudo(pseudo):
    entry = flag_store.get_by_pseudo(pseudo)
    if not entry:
        return jsonify({"error": f"Aucun flag trouvé pour le pseudo '{pseudo}'"}), 404
    return jsonify({
        "discord_user_id": entry["discord_user_id"],
        "pseudo": entry["pseudo"],
        "session_id": entry["session_id"],
        "flag": entry["flag"],
        "generated_at": entry.get("generated_at"),
    })


@app.route("/flag/session/<session_id>", methods=["GET"])
def get_flag_by_session(session_id):
    entry = flag_store.get_by_session(session_id)
    if not entry:
        return jsonify({"error": f"Aucun flag trouvé pour la session '{session_id}'"}), 404
    return jsonify({
        "discord_user_id": entry["discord_user_id"],
        "pseudo": entry["pseudo"],
        "session_id": entry["session_id"],
        "flag": entry["flag"],
        "generated_at": entry.get("generated_at"),
    })


@app.route("/flags", methods=["GET"])
def get_all_flags():
    all_players = flag_store.get_all()
    result = []
    for uid, info in all_players.items():
        result.append({
            "discord_user_id": uid,
            "pseudo": info["pseudo"],
            "session_id": info["session_id"],
            "flag": info["flag"],
            "generated_at": info.get("generated_at"),
        })
    return jsonify({"count": len(result), "players": result})


def start_flask():
    """Démarrer le serveur Flask (appelé depuis un thread)."""
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
