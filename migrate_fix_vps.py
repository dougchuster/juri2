import paramiko, io, sys, time, re

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "82.25.79.50"
USER = "root"
PASS = "#147258369@Beserk"
REMOTE_DIR = "/var/www/adv"

def run_live(client, cmd, timeout=120):
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

# 1. Copiar prisma.config.ts para o container via docker cp
print("=== Copiando prisma.config.ts para o VPS ===")
sftp = client.open_sftp()
sftp.put(r"C:\Users\dougc\Documents\Sistema Juridico ADV\prisma.config.ts",
         f"{REMOTE_DIR}/prisma.config.ts")
sftp.close()
print("[OK] prisma.config.ts enviado ao VPS")

# 2. Copiar do VPS para dentro do container
print("\n=== Copiando prisma.config.ts para dentro do container ===")
code = run_live(client,
    f"docker cp {REMOTE_DIR}/prisma.config.ts juridico-app:/app/prisma.config.ts",
    timeout=30)
print(f"docker cp exit: {code}")

# 3. Verificar DATABASE_URL no container
print("\n=== DATABASE_URL no container ===")
run_live(client, "docker exec juridico-app sh -c 'echo DATABASE_URL=$DATABASE_URL'")

# 4. Executar migrations
print("\n=== Executando migrations ===")
code = run_live(client,
    "docker exec juridico-app sh -c 'cd /app && npx prisma migrate deploy 2>&1'",
    timeout=120)
print(f"\nMigrations exit: {code}")

# 5. Status dos containers
print("\n=== Status dos containers ===")
COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} ps 2>&1", 30)

# 6. Logs do app
print("\n=== Logs do app (ultimas 20 linhas) ===")
run_live(client, "docker logs juridico-app --tail 20 2>&1")

client.close()
print("\n" + "="*60)
print("  https://adv.chuster.com.br")
print("="*60)
