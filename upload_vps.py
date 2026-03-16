import paramiko
import tarfile
import os
import io

HOST = "82.25.79.50"
USER = "root"
PASS = "#147258369@Beserk"
PROJECT_DIR = r"C:\Users\dougc\Documents\Sistema Juridico ADV"
REMOTE_DIR = "/var/www/adv"

EXCLUDE_DIRS = {
    'node_modules', '.next', '.git', 'coverage', 'tmp', 'temp',
    'playwright-report', 'test-results', '.agent',
}
EXCLUDE_FILES = {'.env', '.env.local', '.env.development'}

def should_exclude(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
    # Excluir uploads de usuario
    normalized = rel_path.replace("\\", "/")
    if normalized.startswith("public/uploads"):
        return True
    basename = os.path.basename(rel_path)
    if basename in EXCLUDE_FILES:
        return True
    return False

print("Criando archive do projeto (excluindo node_modules, .next, uploads)...")
buf = io.BytesIO()

with tarfile.open(fileobj=buf, mode="w:gz") as tar:
    count = 0
    for root, dirs, files in os.walk(PROJECT_DIR):
        # Filtrar subdirs excluidos in-place para evitar recursão
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for fname in files:
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, PROJECT_DIR)

            if should_exclude(rel_path):
                continue

            try:
                tar.add(full_path, arcname=rel_path)
                count += 1
            except Exception:
                pass

buf.seek(0)
data = buf.getvalue()
size_mb = len(data) / 1024 / 1024
print(f"  {count} arquivos | {size_mb:.1f} MB")

print(f"\nConectando ao VPS {HOST}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("  Conectado!")

# Criar dir remoto
stdin, stdout, stderr = client.exec_command(f"mkdir -p {REMOTE_DIR}")
stdout.channel.recv_exit_status()

print(f"Enviando {size_mb:.1f} MB para o VPS...")
sftp = client.open_sftp()
buf.seek(0)

# Progress callback
total = len(data)
uploaded = [0]
def progress(sent, total_size):
    pct = (sent / total_size) * 100
    print(f"\r  Progresso: {pct:.0f}% ({sent/1024/1024:.1f}/{total_size/1024/1024:.1f} MB)", end="", flush=True)

sftp.putfo(buf, f"{REMOTE_DIR}/projeto.tar.gz", file_size=total, callback=progress)
sftp.close()
print("\n  Upload concluido!")

# Extrair
print("Extraindo arquivos no VPS...")
stdin, stdout, stderr = client.exec_command(
    f"cd {REMOTE_DIR} && tar -xzf projeto.tar.gz && rm projeto.tar.gz && echo DONE"
)
result = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if result == "DONE":
    print("  Extraido com sucesso!")
else:
    print(f"  Resultado: {result}")
    if err:
        print(f"  Erro: {err}")

# Verificar arquivos
print("\nArquivos no servidor:")
stdin, stdout, stderr = client.exec_command(f"ls -la {REMOTE_DIR} | head -25")
print(stdout.read().decode())

client.close()
print("Upload concluido!")
