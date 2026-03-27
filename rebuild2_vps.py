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
COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"

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

# Enviar Dockerfile corrigido
print("Enviando Dockerfile com NODE_OPTIONS=--max-old-space-size=4096...")
sftp = client.open_sftp()
sftp.put(r"C:\Users\dougc\Documents\Sistema Juridico ADV\Dockerfile", f"{REMOTE_DIR}/Dockerfile")
sftp.close()
print("[✔] Dockerfile enviado\n")

# Verificar RAM disponível no VPS
print("RAM disponível no VPS:")
run_live(client, "free -h", 10)
print()

# Build apenas da imagem app (worker já buildou com sucesso)
print("=" * 70)
print("BUILD — next build com 4GB heap (pode levar 10-15 min)...")
print("=" * 70)
code = run_live(client,
    f"cd {REMOTE_DIR} && {COMPOSE} build app 2>&1",
    timeout=1800)

if code != 0:
    print(f"\n[ERRO] Build falhou com código {code}")
    client.close()
    sys.exit(1)
print("\n[✔] Build concluído!")

# Subir containers
print("\n" + "=" * 70)
print("Iniciando containers...")
print("=" * 70)
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} down --remove-orphans 2>/dev/null || true", 30)
code = run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} up -d 2>&1", 120)
time.sleep(5)
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} ps 2>&1", 30)

# Aguardar postgres
print("\nAguardando PostgreSQL...")
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

# Migrations
print("\nExecutando migrations...")
run_live(client,
    f'cd {REMOTE_DIR} && {COMPOSE} run --rm --entrypoint "" app '
    'sh -c "npx prisma migrate deploy && echo MIGRATIONS_OK" 2>&1',
    timeout=120)

# Status final
print("\n" + "=" * 70)
run_live(client, f"cd {REMOTE_DIR} && {COMPOSE} ps 2>&1", 30)

client.close()

print("\n")
print("=" * 60)
print("  DEPLOY CONCLUIDO!")
print("  https://adv.chuster.com.br")
print("=" * 60)
print()
print("IMPORTANTE: altere a senha root do VPS!")
print("  passwd root")
