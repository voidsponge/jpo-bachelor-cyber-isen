import discord
from discord.ext import commands
from datetime import datetime
from ui_components import CTFView
from flask_server import start_flask
import threading

# --- CONFIGURATION ---
TOKEN = "TON_TOKEN_DISCORD"
WELCOME_CHANNEL_ID = 1440471709005385856
ROLE_ID = 1440471708178841719
CTF_CHANNEL_ID = 1463172539722236007

intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    bot.add_view(CTFView())
    print(f"--- Bot Black Mamba opérationnel : {bot.user.name} ---")
    print(f"--- Flask API disponible sur http://0.0.0.0:5000 ---")


@bot.event
async def on_member_join(member):
    if member.bot:
        return

    # 1. Attribution du rôle automatique
    role = member.guild.get_role(ROLE_ID)
    if role:
        try:
            await member.add_roles(role)
        except Exception:
            print(f"Erreur de permissions pour le rôle sur {member.name}")

    # 2. Message de bienvenue
    welcome_channel = bot.get_channel(WELCOME_CHANNEL_ID)
    if welcome_channel:
        embed_bvn = discord.Embed(
            title="Bienvenue dans l'équipe ! 🎙️",
            description=(
                f"Salut {member.mention} ! Content de te voir parmi nous. 🚀\n\n"
                "Ici, c'est l'endroit idéal pour savoir quand je suis en live et discuter avec la communauté.\n\n"
                "Installe-toi bien et profite du stream ! 🔥"
            ),
            color=0x6441A5,
            timestamp=datetime.now(),
        )
        embed_bvn.set_thumbnail(url=member.display_avatar.url)
        await welcome_channel.send(embed=embed_bvn)

    # 3. Message CTF avec bouton
    ctf_channel = bot.get_channel(CTF_CHANNEL_ID)
    if ctf_channel:
        embed_ctf = discord.Embed(
            title="🚩 Nouvelle épreuve de Capture The Flag",
            description=(
                f"Hé {member.mention}, une nouvelle mission t'attend !\n\n"
                "Clique sur le bouton ci-dessous pour récupérer ton flag."
            ),
            color=discord.Color.gold(),
        )
        embed_ctf.set_footer(text=f"Destiné à : {member.name}")
        await ctf_channel.send(
            content=member.mention, embed=embed_ctf, view=CTFView()
        )


if __name__ == "__main__":
    # Lancer Flask dans un thread séparé
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()

    bot.run(TOKEN)
