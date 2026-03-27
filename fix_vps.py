import paramiko, io, sys, time, re

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "187.77.255.211"
USER = "root"
PASS = "#147258369@Beserk"
REMOTE_DIR = "/var/www/adv"
COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"

def run_live(client, cmd, timeout=300):
    transport = client.get_transport()
    channel = transport.open_session()
    channel.get_pty(width=200, height=50)
    channel.settimeout(timeout)
    channel.exec_command(cmd)
    while not channel.exit_status_ready():
        if channel.recv_ready():
            data = channel.recv(4096).decode("utf-8", errors="replace")
            clean = re.sub(r'\x1b\[[0-9;]*[mKHJF]', '', data)
            clean = re.sub(r'\x1b\[\?[0-9;]*[hl]', '', clean)
            clean = re.sub(r'\r', '', clean)
            print(clean, end="", flush=True)
        time.sleep(0.05)
    while channel.recv_ready():
        data = channel.recv(4096).decode("utf-8", errors="replace")
        clean = re.sub(r'\x1b\[[0-9;]*[mKHJF]', '', data)
        clean = re.sub(r'\r', '', clean)
        print(clean, end="", flush=True)
    return channel.recv_exit_status()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Conectado!\n")

# 1. Verificar DATABASE_URL no container
print("=== Verificando env vars no container ===")
run_live(client, "docker exec juridico-app env 2>&1 | grep -E 'DATABASE_URL|REDIS_URL|NODE_ENV'")

# 2. Enviar Dockerfile corrigido (com .whatsapp-auth)
print("\n=== Enviando Dockerfile corrigido ===")
sftp = client.open_sftp()
sftp.put(r"C:\Users\dougc\Documents\Sistema Juridico ADV\Dockerfile", f"{REMOTE_DIR}/Dockerfile")
sftp.close()
print("[✔] Dockerfile enviado")

# 3. Rebuild app (apenas o runner stage muda, usa cache do builder)
print("\n=== Rebuild app (com fix .whatsapp-auth) ===")
code = run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} build app 2>&1", timeout=1200)
if code != 0:
    print(f"[ERRO] Build falhou: {code}")
    client.close()
    sys.exit(1)
print("[✔] Build OK")

# 4. Reiniciar app
print("\n=== Reiniciando app ===")
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} up -d --no-deps app 2>&1", 60)
time.sleep(8)

# 5. Migrations usando env do .env.production diretamente
print("\n=== Migrations ===")
code = run_live(client,
    f"cd {REMOTE_DIR} && "
    "source <(grep -v '^#' .env.production | grep '=' | sed 's/^/export /') && "
    "docker exec -e DATABASE_URL=\"$DATABASE_URL\" juridico-app "
    "sh -c 'npx prisma migrate deploy 2>&1'",
    timeout=120)
print(f"Migrations exit: {code}")

# 6. Logs finais
print("\n=== Logs do app (30 linhas) ===")
run_live(client, "docker logs juridico-app --tail 30 2>&1")

print("\n=== Status final ===")
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} ps 2>&1")

client.close()
print("\n\n" + "="*60)
print("  https://adv.chuster.com.br")
print("="*60)
