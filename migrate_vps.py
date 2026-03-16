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

print("=== Status dos containers ===")
run_live(client, f"cd {REMOTE_DIR} && docker compose --env-file .env.production -f docker-compose.prod.yml ps 2>&1")

print("\n=== Executando migrations via container app ===")
# Rodar migrate deploy diretamente no container app em execução
code = run_live(client,
    "docker exec juridico-app sh -c 'npx prisma migrate deploy 2>&1'",
    timeout=120)
print(f"\nCódigo de saída: {code}")

print("\n=== Verificando logs do app (últimas 30 linhas) ===")
run_live(client, "docker logs juridico-app --tail 30 2>&1")

print("\n=== Verificando logs do nginx ===")
run_live(client, "docker logs juridico-nginx --tail 20 2>&1")

client.close()
print("\nConcluído!")
