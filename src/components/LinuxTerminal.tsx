import { useState, useRef, useEffect } from "react";
import { Terminal } from "lucide-react";

interface LinuxTerminalProps {
  secretFlag: string;
  onFlagFound: () => void;
}

// Virtual filesystem structure
const createFileSystem = (flag: string) => ({
  "/": {
    type: "dir",
    children: ["home", "var", "etc", "tmp", "usr"],
  },
  "/home": {
    type: "dir",
    children: ["user", "guest"],
  },
  "/home/user": {
    type: "dir",
    children: ["documents", "downloads", ".secret"],
  },
  "/home/user/documents": {
    type: "dir",
    children: ["readme.txt", "notes.txt"],
  },
  "/home/user/documents/readme.txt": {
    type: "file",
    content: "Bienvenue sur ce système Linux!\nExplore les fichiers pour trouver le flag caché.\n\nCommandes disponibles: ls, cd, cat, pwd, clear, help",
  },
  "/home/user/documents/notes.txt": {
    type: "file",
    content: "Note personnelle:\nJ'ai caché quelque chose d'important quelque part...\nPeut-être dans un dossier caché?",
  },
  "/home/user/downloads": {
    type: "dir",
    children: ["image.png", "archive.zip"],
  },
  "/home/user/downloads/image.png": {
    type: "file",
    content: "[Fichier binaire - impossible à afficher]",
  },
  "/home/user/downloads/archive.zip": {
    type: "file",
    content: "[Fichier binaire - impossible à afficher]",
  },
  "/home/user/.secret": {
    type: "dir",
    children: [".hidden_flag.txt", "decoy.txt"],
  },
  "/home/user/.secret/decoy.txt": {
    type: "file",
    content: "Ha! Tu pensais trouver le flag ici?\nContinue à chercher...",
  },
  "/home/user/.secret/.hidden_flag.txt": {
    type: "file",
    content: `Félicitations! Tu as trouvé le flag!\n\n${flag}\n\nCopie ce flag et soumets-le pour valider le challenge.`,
  },
  "/home/guest": {
    type: "dir",
    children: ["welcome.txt"],
  },
  "/home/guest/welcome.txt": {
    type: "file",
    content: "Compte invité - accès limité",
  },
  "/var": {
    type: "dir",
    children: ["log", "www"],
  },
  "/var/log": {
    type: "dir",
    children: ["syslog", "auth.log"],
  },
  "/var/log/syslog": {
    type: "file",
    content: "Dec 16 10:00:01 server CRON[1234]: (root) CMD (command)\nDec 16 10:15:00 server sshd[5678]: Accepted password for user\nDec 16 10:20:00 server kernel: [UFW BLOCK] IN=eth0",
  },
  "/var/log/auth.log": {
    type: "file",
    content: "Dec 16 09:00:00 server sshd[1111]: Failed password for invalid user admin\nDec 16 09:00:01 server sshd[1111]: Failed password for invalid user root\nHint: Les fichiers cachés commencent par un point (.)",
  },
  "/var/www": {
    type: "dir",
    children: ["index.html"],
  },
  "/var/www/index.html": {
    type: "file",
    content: "<html><body><h1>It works!</h1></body></html>",
  },
  "/etc": {
    type: "dir",
    children: ["passwd", "hostname"],
  },
  "/etc/passwd": {
    type: "file",
    content: "root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:User:/home/user:/bin/bash\nguest:x:1001:1001:Guest:/home/guest:/bin/bash",
  },
  "/etc/hostname": {
    type: "file",
    content: "ctf-challenge-box",
  },
  "/tmp": {
    type: "dir",
    children: ["cache"],
  },
  "/tmp/cache": {
    type: "dir",
    children: [],
  },
  "/usr": {
    type: "dir",
    children: ["bin", "share"],
  },
  "/usr/bin": {
    type: "dir",
    children: [],
  },
  "/usr/share": {
    type: "dir",
    children: ["hint.txt"],
  },
  "/usr/share/hint.txt": {
    type: "file",
    content: "Indice: Utilise 'ls -a' pour voir les fichiers cachés!\nLes dossiers secrets sont souvent dans /home",
  },
});

const LinuxTerminal = ({ secretFlag, onFlagFound }: LinuxTerminalProps) => {
  const [history, setHistory] = useState<string[]>([
    "ISEN CyberCTF - Terminal Linux v1.0",
    "Tape 'help' pour voir les commandes disponibles.",
    "",
  ]);
  const [currentPath, setCurrentPath] = useState("/home/user");
  const [input, setInput] = useState("");
  const [fileSystem] = useState(() => createFileSystem(secretFlag));
  const [flagFound, setFlagFound] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalizePath = (path: string): string => {
    if (path.startsWith("/")) {
      return path;
    }
    const combined = currentPath === "/" ? `/${path}` : `${currentPath}/${path}`;
    const parts = combined.split("/").filter(Boolean);
    const normalized: string[] = [];
    
    for (const part of parts) {
      if (part === "..") {
        normalized.pop();
      } else if (part !== ".") {
        normalized.push(part);
      }
    }
    
    return "/" + normalized.join("/") || "/";
  };

  const executeCommand = (cmd: string) => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    let output: string[] = [];

    switch (command) {
      case "help":
        output = [
          "Commandes disponibles:",
          "  ls [-a]     - Liste les fichiers (avec -a pour les fichiers cachés)",
          "  cd <dir>    - Change de répertoire",
          "  cat <file>  - Affiche le contenu d'un fichier",
          "  pwd         - Affiche le répertoire courant",
          "  clear       - Efface l'écran",
          "  help        - Affiche cette aide",
        ];
        break;

      case "pwd":
        output = [currentPath];
        break;

      case "clear":
        setHistory([]);
        return;

      case "ls": {
        const showHidden = args.includes("-a");
        const targetPath = args.find(a => !a.startsWith("-")) || currentPath;
        const normalizedPath = normalizePath(targetPath);
        const node = fileSystem[normalizedPath as keyof typeof fileSystem];
        
        if (!node) {
          output = [`ls: impossible d'accéder à '${targetPath}': Aucun fichier ou dossier de ce type`];
        } else if (node.type === "file") {
          output = [targetPath];
        } else {
          const children = (node as any).children as string[];
          const visible = showHidden ? children : children.filter((c: string) => !c.startsWith("."));
          output = visible.length > 0 ? [visible.join("  ")] : [""];
        }
        break;
      }

      case "cd": {
        if (!args[0] || args[0] === "~") {
          setCurrentPath("/home/user");
          return;
        }
        const targetPath = normalizePath(args[0]);
        const node = fileSystem[targetPath as keyof typeof fileSystem];
        
        if (!node) {
          output = [`cd: ${args[0]}: Aucun fichier ou dossier de ce type`];
        } else if (node.type === "file") {
          output = [`cd: ${args[0]}: N'est pas un dossier`];
        } else {
          setCurrentPath(targetPath);
          return;
        }
        break;
      }

      case "cat": {
        if (!args[0]) {
          output = ["cat: opérande manquant"];
          break;
        }
        const targetPath = normalizePath(args[0]);
        const node = fileSystem[targetPath as keyof typeof fileSystem];
        
        if (!node) {
          output = [`cat: ${args[0]}: Aucun fichier ou dossier de ce type`];
        } else if (node.type === "dir") {
          output = [`cat: ${args[0]}: est un dossier`];
        } else {
          output = (node as any).content.split("\n");
          // Check if flag was found
          if (targetPath === "/home/user/.secret/.hidden_flag.txt" && !flagFound) {
            setFlagFound(true);
            onFlagFound();
          }
        }
        break;
      }

      case "":
        break;

      default:
        output = [`${command}: commande introuvable. Tape 'help' pour l'aide.`];
    }

    setHistory(prev => [...prev, `user@ctf:${currentPath}$ ${cmd}`, ...output]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(input);
      setInput("");
    }
  };

  const getPromptPath = () => {
    if (currentPath === "/home/user") return "~";
    if (currentPath.startsWith("/home/user/")) return "~" + currentPath.slice(10);
    return currentPath;
  };

  return (
    <div 
      className="bg-black rounded-lg border border-primary/30 overflow-hidden font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-primary/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <Terminal className="h-3 w-3" />
          <span>user@ctf-challenge-box</span>
        </div>
      </div>

      {/* Terminal content */}
      <div 
        ref={terminalRef}
        className="h-64 overflow-y-auto p-4 text-green-400 cursor-text"
      >
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap leading-relaxed">
            {line}
          </div>
        ))}
        
        {/* Input line */}
        <div className="flex items-center">
          <span className="text-cyan-400">user@ctf</span>
          <span className="text-white">:</span>
          <span className="text-blue-400">{getPromptPath()}</span>
          <span className="text-white">$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
};

export default LinuxTerminal;