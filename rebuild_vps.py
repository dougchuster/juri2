import paramiko
import io
import sys
import time
import re

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "187.77.255.211"
USER = "root"
PASS = "#147258369@Beserk"
REMOTE_DIR = "/var/www/adv"

def run_live(client, cmd, timeout=1800):
    transport = client.get_transport()
    channel = transport.open_session()
    channel.get_pty(width=200, height=50)
    channel.settimeout(timeout)
    channel.exec_command(cmd)
    while not channel.exit_status_ready():
        if channel.recv_ready():
            data = channel.recv(8192).decode("utf-8", errors="replace")
            clean = re.sub(r'\x1b\[[0-9;]*[mKHJF]', '', data)
            clean = re.sub(r'\x1b\[\?[0-9;]*[hl]', '', clean)
            clean = re.sub(r'\r', '', clean)
            print(clean, end="", flush=True)
        time.sleep(0.05)
    while channel.recv_ready():
        data = channel.recv(8192).decode("utf-8", errors="replace")
        clean = re.sub(r'\x1b\[[0-9;]*[mKHJF]', '', data)
        clean = re.sub(r'\r', '', clean)
        print(clean, end="", flush=True)
    return channel.recv_exit_status()

print("Conectando ao VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Conectado!\n")

# Enviar Dockerfiles corrigidos via SFTP
print("Enviando Dockerfiles corrigidos...")
sftp = client.open_sftp()
sftp.put(r"C:\Users\dougc\Documents\Sistema Juridico ADV\Dockerfile",
         f"{REMOTE_DIR}/Dockerfile")
sftp.put(r"C:\Users\dougc\Documents\Sistema Juridico ADV\Dockerfile.worker",
         f"{REMOTE_DIR}/Dockerfile.worker")
sftp.close()
print("[✔] Dockerfiles enviados\n")

COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"

# Build
print("=" * 70)
print("6/8 Build das imagens (npm install — pode levar 10-15 min)...")
print("=" * 70)
code = run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} build --parallel 2>&1", timeout=1800)
if code != 0:
    print(f"\n[ERRO] Build falhou com código {code}")
    client.close()
    sys.exit(1)
print("\n[✔] Build concluído!")

# Subir containers
print("\n" + "=" * 70)
print("7/8 Iniciando containers...")
print("=" * 70)
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} down --remove-orphans 2>/dev/null || true", 30)
code = run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} up -d 2>&1", 120)
print(f"\n[✔] Containers iniciados (código {code})")

# Status
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} ps 2>&1", 30)

# Aguardar postgres
print("\n" + "=" * 70)
print("8/8 Migrations do banco...")
print("=" * 70)
print("Aguardando PostgreSQL ficar healthy...")
for i in range(24):
    _, stdout, _ = client.exec_command(
        "docker inspect --format='{{.State.Health.Status}}' juridico-db 2>/dev/null"
    )
    status = stdout.read().decode().strip()
    print(f"\r  postgres: {status} ({i+1}/24)", end="", flush=True)
    if status == "healthy":
        break
    time.sleep(5)
print()

code = run_live(client,
    f'cd {REMOTE_DIR} && {COMPOSE} run --rm --entrypoint "" app '
    'sh -c "npx prisma migrate deploy && echo MIGRATIONS_OK" 2>&1',
    timeout=120)

client.close()

print("\n")
print("=" * 60)
print("  DEPLOY CONCLUIDO!")
print("  URL: https://adv.chuster.com.br")
print("=" * 60)
print()
print("Comandos uteis no VPS (ssh root@187.77.255.211):")
print(f"  cd {REMOTE_DIR}")
COMPOSE_SHORT = "docker compose --env-file .env.production -f docker-compose.prod.yml"
print(f"  {COMPOSE_SHORT} logs -f app")
print(f"  {COMPOSE_SHORT} logs -f worker")
print(f"  {COMPOSE_SHORT} ps")
