import paramiko, io, sys, time, re

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "82.25.79.50"
USER = "root"
PASS = "#147258369@Beserk"
REMOTE_DIR = "/var/www/adv"
COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"
LOCAL = r"C:\Users\dougc\Documents\Sistema Juridico ADV"

def run_live(client, cmd, timeout=300):
    ch = client.get_transport().open_session()
    ch.get_pty(width=220, height=50)
    ch.settimeout(timeout)
    ch.exec_command(cmd)
    while not ch.exit_status_ready():
        if ch.recv_ready():
            data = ch.recv(8192).decode("utf-8", errors="replace")
            clean = re.sub(r'\x1b\[[0-9;]*[mKHJF]', '', data)
            clean = re.sub(r'\x1b\[\?[0-9;]*[hl]', '', clean)
            clean = re.sub(r'\r', '', clean)
            print(clean, end="", flush=True)
        time.sleep(0.05)
    while ch.recv_ready():
        data = ch.recv(8192).decode("utf-8", errors="replace")
        print(re.sub(r'\x1b\[[0-9;]*[mKHJF]', '', data), end="", flush=True)
    return ch.recv_exit_status()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Conectado!\n")

# 1. Enviar arquivos fonte modificados
print("=== Enviando arquivos modificados ===")
sftp = client.open_sftp()

files = [
    (r"Dockerfile",                                f"{REMOTE_DIR}/Dockerfile"),
    (r"Dockerfile.worker",                         f"{REMOTE_DIR}/Dockerfile.worker"),
    (r"package.json",                              f"{REMOTE_DIR}/package.json"),
    (r"next.config.ts",                            f"{REMOTE_DIR}/next.config.ts"),
    (r"prisma.config.ts",                          f"{REMOTE_DIR}/prisma.config.ts"),
    (r"src\lib\services\ai-gemini.ts",             f"{REMOTE_DIR}/src/lib/services/ai-gemini.ts"),
    (r"src\lib\db.ts",                             f"{REMOTE_DIR}/src/lib/db.ts"),
    (r"prisma\seed.ts",                            f"{REMOTE_DIR}/prisma/seed.ts"),
    (r"scripts\deduplicate-prazos.ts",             f"{REMOTE_DIR}/scripts/deduplicate-prazos.ts"),
    (r"scripts\repair-taxonomy-texts.ts",          f"{REMOTE_DIR}/scripts/repair-taxonomy-texts.ts"),
    (r"scripts\seed-crm.ts",                       f"{REMOTE_DIR}/scripts/seed-crm.ts"),
    (r"scripts\setup-equipe-juridica.js",          f"{REMOTE_DIR}/scripts/setup-equipe-juridica.js"),
    (r"scripts\test-distribuicao-db.ts",           f"{REMOTE_DIR}/scripts/test-distribuicao-db.ts"),
    (r"scripts\update-datajud-aliases.ts",         f"{REMOTE_DIR}/scripts/update-datajud-aliases.ts"),
    (r"src\components\theme-provider.tsx",         f"{REMOTE_DIR}/src/components/theme-provider.tsx"),
    (r"src\app\layout.tsx",                        f"{REMOTE_DIR}/src/app/layout.tsx"),
    (r"src\components\layout\sidebar.tsx",         f"{REMOTE_DIR}/src/components/layout/sidebar.tsx"),
    (r"src\components\marketing\legal-landing-page.tsx", f"{REMOTE_DIR}/src/components/marketing/legal-landing-page.tsx"),
]

for local_rel, remote in files:
    local_path = f"{LOCAL}\\{local_rel}"
    sftp.put(local_path, remote)
    print(f"  [OK] {local_rel}")

sftp.close()
print("[✔] Arquivos enviados\n")

# 2. Rebuild app
print("=== Build da imagem app ===")
code = run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} build app 2>&1", timeout=1800)
if code != 0:
    print(f"\n[ERRO] Build falhou: {code}")
    client.close()
    sys.exit(1)
print("\n[✔] Build OK")

# 3. Rebuild worker
print("\n=== Build da imagem worker ===")
code = run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} build worker 2>&1", timeout=900)
if code != 0:
    print(f"\n[ERRO] Worker build falhou: {code}")
    client.close()
    sys.exit(1)
print("\n[✔] Worker build OK")

# 4. Reiniciar
print("\n=== Reiniciando containers ===")
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} up -d --no-deps app worker 2>&1", 60)
time.sleep(10)

# 5. Status e logs
print("\n=== Status ===")
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} ps 2>&1", 30)

print("\n=== Logs app (ultimas 20) ===")
run_live(client, "docker logs juridico-app --tail 20 2>&1")

print("\n=== Logs worker (ultimas 10) ===")
run_live(client, "docker logs juridico-worker --tail 10 2>&1")

print("\n=== Teste HTTP ===")
run_live(client, 'curl -sk -o /dev/null -w "Login: %{http_code}\n" https://adv.chuster.com.br/login')

client.close()
print("\n" + "="*60)
print("  https://adv.chuster.com.br")
print("="*60)
