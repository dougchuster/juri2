import paramiko
import time
import io
import sys

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "82.25.79.50"
USER = "root"
PASS = "#147258369@Beserk"

print("Conectando ao VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Conectado!\n")

# Matar processo anterior se ainda estiver rodando
client.exec_command("pkill -f vps-setup.sh 2>/dev/null; sleep 1")
time.sleep(2)

# Rodar com "sim" pre-respondido e sem check de DNS
transport = client.get_transport()
channel = transport.open_session()
channel.get_pty(width=200, height=50)
channel.settimeout(2400)

# Passa "sim" via echo para o read do script
channel.exec_command("cd /var/www/adv && echo 'sim' | TERM=xterm bash vps-setup.sh 2>&1 | cat")

print("=" * 70)
print("Deploy iniciado — aguardando conclusao (pode levar 10-20 min)...")
print("=" * 70 + "\n")

last_output_time = time.time()
while not channel.exit_status_ready():
    if channel.recv_ready():
        data = channel.recv(8192).decode("utf-8", errors="replace")
        # Limpar escape codes ANSI para saida limpa
        import re
        clean = re.sub(r'\x1b\[[0-9;]*[mKHJ]', '', data)
        clean = re.sub(r'\x1b\[\?[0-9;]*[hl]', '', clean)
        clean = re.sub(r'\r', '', clean)
        print(clean, end="", flush=True)
        last_output_time = time.time()
    elif time.time() - last_output_time > 300:
        print("\n[Sem output ha 5 min — processo ainda rodando...]")
        last_output_time = time.time()
    time.sleep(0.1)

# Flush final
while channel.recv_ready():
    data = channel.recv(8192).decode("utf-8", errors="replace")
    import re
    clean = re.sub(r'\x1b\[[0-9;]*[mKHJ]', '', data)
    clean = re.sub(r'\r', '', clean)
    print(clean, end="", flush=True)

exit_code = channel.recv_exit_status()
print(f"\n\nScript finalizado — codigo de saida: {exit_code}")

if exit_code == 0:
    print("\n*** DEPLOY CONCLUIDO COM SUCESSO! ***")
    print("Acesse: https://adv.chuster.com.br")
else:
    print("\n*** ERRO NO DEPLOY — veja o output acima ***")

client.close()
