import discord
import random
import os
import aiohttp
from flag_store import flag_store

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- CONFIGURATION PLATEFORME CTF ---
SUPABASE_URL = "https://qjwzplhclyjefueswncx.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd3pwbGhjbHlqZWZ1ZXN3bmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzA0NjYsImV4cCI6MjA4MTQ0NjQ2Nn0.VzoX79TA7sTST_y1g6nlTLJjrWEAmrmeESFbunG3iik"
RECORD_SUBMISSION_URL = f"{SUPABASE_URL}/functions/v1/record-external-submission"

# L'ID du challenge Discord sur ta plateforme (à récupérer depuis le panel admin)
CHALLENGE_ID = "REMPLACE_PAR_TON_CHALLENGE_ID"


def load_words(filename):
    file_path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(file_path):
        return ["Erreur"]
    with open(file_path, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]
    return words


def generate_flag():
    names = load_words("FG_NAME")
    adjs = load_words("FG_ADJ")
    return "ISEN{" + f"{random.choice(names)}_{random.choice(adjs)}" + "}"


async def find_player_session(pseudo: str):
    """Cherche le joueur existant par pseudo sur la plateforme CTF."""
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{SUPABASE_URL}/rest/v1/players?pseudo=eq.{pseudo}&select=session_id,id"
            async with session.get(
                url,
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                },
            ) as resp:
                data = await resp.json()
                if data and len(data) > 0:
                    return data[0]["session_id"]
                return None
    except Exception as e:
        print(f"Erreur lors de la recherche du joueur : {e}")
        return None


async def report_to_platform(pseudo: str, flag: str, session_id: str):
    """Envoie le flag validé à la plateforme CTF pour créditer les points."""
    payload = {
        "challengeId": CHALLENGE_ID,
        "submittedFlag": flag,
        "sessionId": session_id,
        "pseudo": pseudo,
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                RECORD_SUBMISSION_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                },
            ) as resp:
                data = await resp.json()
                return data
    except Exception as e:
        print(f"Erreur lors de l'envoi à la plateforme : {e}")
        return None


# --- MODAL PSEUDO ---
class PseudoModal(discord.ui.Modal, title="Enregistrement CTF"):
    pseudo = discord.ui.TextInput(
        label="Quel est ton pseudo sur la plateforme CTF ?",
        placeholder="Entre le même pseudo que sur le site CTF...",
        min_length=2,
        max_length=30,
    )

    async def on_submit(self, interaction: discord.Interaction):
        discord_user_id = str(interaction.user.id)
        pseudo_value = self.pseudo.value.strip()

        # Chercher le joueur existant sur la plateforme par pseudo
        session_id = await find_player_session(pseudo_value)
        if not session_id:
            await interaction.response.send_message(
                f"❌ Aucun joueur avec le pseudo **{pseudo_value}** trouvé sur la plateforme CTF.\n"
                f"Assure-toi d'utiliser le même pseudo que sur le site !",
                ephemeral=True,
            )
            return

        # Générer le flag
        flag = generate_flag()

        # Sauvegarder dans le store
        flag_store.save(
            discord_user_id=discord_user_id,
            pseudo=pseudo_value,
            session_id=session_id,
            flag=flag,
        )

        # Envoyer à la plateforme CTF
        result = await report_to_platform(
            pseudo=pseudo_value,
            flag=flag,
            session_id=session_id,
        )

        # Construire la réponse
        if result and result.get("correct"):
            points = result.get("points", "?")
            score = result.get("score", "?")
            total_flags = result.get("totalFlags", "?")

            if result.get("alreadyFound"):
                msg = (
                    f"⚠️ **{pseudo_value}**, tu as déjà résolu ce challenge !\n"
                    f"Ton flag était : `{flag}`"
                )
            else:
                msg = (
                    f"🎉 Bravo **{pseudo_value}** !\n\n"
                    f"🚩 Flag : `{flag}`\n"
                    f"💰 **+{points} points** crédités sur la plateforme CTF !\n"
                    f"🔗 Session ID : `{session_id}` | Flags trouvés : **{total_flags}**"
                )
        elif result and not result.get("correct"):
            msg = (
                f"Voici ton flag **{pseudo_value}** : `{flag}`\n"
                f"⚠️ Le flag n'a pas été validé sur la plateforme."
            )
        else:
            msg = (
                f"Voici ton flag **{pseudo_value}** : `{flag}`\n"
                f"⚠️ Impossible de contacter la plateforme CTF. "
                f"Tes points n'ont pas été crédités."
            )

        await interaction.response.send_message(msg, ephemeral=True)


# --- VUE AVEC BOUTON ---
class CTFView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Récupérer mon Flag",
        style=discord.ButtonStyle.success,
        custom_id="btn_ctf_flag",
        emoji="🚩",
    )
    async def flag_button(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ):
        await interaction.response.send_modal(PseudoModal())
