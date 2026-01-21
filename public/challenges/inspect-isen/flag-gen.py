import random
import os

def load_words(filename):
    with open(filename, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]
    return words

def generate_composed_word():
    names = load_words("/FLAG-GEN/FG_NAME")
    adjs = load_words("/FLAG-GEN/FG_ADJ")

    name = random.choice(names)
    adj = random.choice(adjs)

    composed = f"{name}_{adj}"
    return composed

V_FLAG = "FLAG_ISEN" + "{" + f"{generate_composed_word()}" + "}"

output_file = os.path.join("/FLAG-GEN/", "flag")
with open(output_file, "w", encoding="utf-8") as f:
    f.write(V_FLAG)
os.chmod(output_file, 0o666)
