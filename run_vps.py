import paramiko
import time
import sys
import io

# Forçar UTF-8 no stdout do Windows
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "187.77.255.211"
USER = "root"
PASS = "#147258369@Beserk"

def run_live(client, cmd, timeout=1800):
    """Executa comando com output em tempo real."""
    transport = client.get_transport()
    channel = transport.open_session()
    channel.get_pty(width=200, height=50)
    channel.settimeout(timeout)
    channel.exec_command(cmd)

    start = time.time()
    while not channel.exit_status_ready():
        if channel.recv_ready():
            data = channel.recv(8192).decode("utf-8", errors="replace")
            print(data, end="", flush=True)
        if time.time() - start > timeout:
            print("\n[TIMEOUT]")
            break
        time.sleep(0.05)

    # Flush restante
    while channel.recv_ready():
        data = channel.recv(8192).decode("utf-8", errors="replace")
        print(data, end="", flush=True)

    return channel.recv_exit_status()

print("Conectando ao VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Conectado!\n")

# Verificar se setup script existe
code = run_live(client, "ls -la /var/www/adv/vps-setup.sh && echo '--- ARQUIVO OK ---'")

print("\n\nExecutando vps-setup.sh...\n")
print("=" * 70)

code = run_live(
    client,
    "cd /var/www/adv && chmod +x vps-setup.sh && TERM=xterm bash vps-setup.sh 2>&1 | cat",
    timeout=2400  # 40 minutos (build pode demorar)
)

print(f"\n\nScript finalizado com código: {code}")
client.close()
