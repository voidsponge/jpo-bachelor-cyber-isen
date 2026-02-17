import discord
import random
import os
import aiohttp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- CONFIGURATION PLATEFORME CTF ---
# L'URL de l'edge function de ta plateforme
SUPABASE_URL = "https://qjwzplhclyjefueswncx.supabase.co"
RECORD_SUBMISSION_URL = f"{SUPABASE_URL}/functions/v1/record-external-submission"

# L'ID du challenge Discord sur ta plateforme (à récupérer depuis le panel admin)
CHALLENGE_ID = "REMPLACE_PAR_TON_CHALLENGE_ID"

# Chemin du fichier où le flag est sauvegardé
FLAG_FILE = os.path.join(BASE_DIR, "flag.txt")


def load_words(filename):
    file_path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(file_path):
        return ["Erreur"]
    with open(file_path, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]
    return words


def generate_composed_word():
    names = load_words("FG_NAME")
    adjs = load_words("FG_ADJ")
    return f"{random.choice(names)}_{random.choice(adjs)}"


def save_flag(pseudo: str, flag: str):
    """Écrase le fichier flag.txt avec le nouveau flag généré."""
    with open(FLAG_FILE, "w", encoding="utf-8") as f:
        f.write(f"Joueur : {pseudo}\n")
        f.write(f"Flag   : {flag}\n")


async def report_to_platform(pseudo: str, flag: str, discord_user_id: str):
    """Envoie le flag validé à la plateforme CTF pour créditer les points."""
    payload = {
        "challengeId": CHALLENGE_ID,
        "submittedFlag": flag,
        "sessionId": f"discord_{discord_user_id}",
        "pseudo": pseudo,
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(RECORD_SUBMISSION_URL, json=payload) as resp:
                data = await resp.json()
                return data
    except Exception as e:
        print(f"Erreur lors de l'envoi à la plateforme : {e}")
        return None


# --- LA FENÊTRE SURGISSANTE (MODAL) ---
class PseudoModal(discord.ui.Modal, title="Enregistrement CTF"):
    pseudo = discord.ui.TextInput(
        label="Quel est ton pseudo ?",
        placeholder="Entre ton pseudo ici...",
        min_length=3,
        max_length=20,
    )

    async def on_submit(self, interaction: discord.Interaction):
        # Génération du flag
        dynamic_flag = "ISEN{" + generate_composed_word() + "}"

        # Sauvegarde locale
        save_flag(self.pseudo.value, dynamic_flag)

        # Envoi à la plateforme CTF
        result = await report_to_platform(
            pseudo=self.pseudo.value,
            flag=dynamic_flag,
            discord_user_id=str(interaction.user.id),
        )

        # Construction du message de réponse
        if result and result.get("correct"):
            points = result.get("points", "?")
            score = result.get("score", "?")
            total_flags = result.get("totalFlags", "?")

            if result.get("alreadyFound"):
                msg = (
                    f"⚠️ **{self.pseudo.value}**, tu as déjà résolu ce challenge !\n"
                    f"Ton flag était : `{dynamic_flag}`"
                )
            else:
                msg = (
                    f"🎉 Bravo **{self.pseudo.value}** !\n\n"
                    f"🚩 Flag : `{dynamic_flag}`\n"
                    f"💰 **+{points} points** crédités sur la plateforme CTF !\n"
                    f"📊 Score total : **{score} pts** | Flags trouvés : **{total_flags}**"
                )
        elif result and not result.get("correct"):
            msg = (
                f"Voici ton flag **{self.pseudo.value}** : `{dynamic_flag}`\n"
                f"⚠️ Le flag n'a pas été validé sur la plateforme."
            )
        else:
            msg = (
                f"Voici ton flag **{self.pseudo.value}** : `{dynamic_flag}`\n"
                f"⚠️ Impossible de contacter la plateforme CTF. "
                f"Tes points n'ont pas été crédités."
            )

        await interaction.response.send_message(msg, ephemeral=True)


# --- LA VUE AVEC LE BOUTON ---
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
