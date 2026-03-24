/**
 * gerar-auth-whatsapp-local.js
 *
 * Execute LOCALMENTE (não no VPS) para gerar as credenciais WhatsApp.
 * Após escanear o QR, os arquivos de autenticação são salvos em:
 *   ./whatsapp-auth-local/
 *
 * Depois rode: node scripts/importar-auth-vps.js
 * (ou siga as instruções impressas no final)
 *
 * Uso: node scripts/gerar-auth-whatsapp-local.js
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, '..', 'whatsapp-auth-local');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const logger = {
  level: 'silent',
  info: () => {},
  warn: () => {},
  error: (obj, msg) => console.error('[baileys error]', msg || JSON.stringify(obj).slice(0, 200)),
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: function () { return this; }
};

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log('══════════════════════════════════════════════');
      console.log('  Escaneie o QR code abaixo com seu WhatsApp  ');
      console.log('══════════════════════════════════════════════\n');
      qrcode.generate(qr, { small: true });
      console.log('\n(WhatsApp → Dispositivos conectados → Conectar dispositivo)');
    }

    if (connection === 'open') {
      console.log('\n✅ WhatsApp conectado com sucesso!');
      console.log('📁 Credenciais salvas em:', AUTH_DIR);
      console.log('\n─────────────────────────────────────────────');
      console.log('PRÓXIMO PASSO: Envie os arquivos para o VPS:');
      console.log('─────────────────────────────────────────────');
      console.log('\n  1. Copie a pasta whatsapp-auth-local/ para o VPS:');
      console.log('     scp -r whatsapp-auth-local/ root@82.25.79.50:/tmp/wa-auth/\n');
      console.log('  2. No VPS, mova para o volume do Evolution API:');
      console.log('     ssh root@82.25.79.50');
      console.log('     docker exec juridico-evolution mkdir -p /evolution/instances/juridico-adv');
      console.log('     docker cp /tmp/wa-auth/. juridico-evolution:/evolution/instances/juridico-adv/\n');
      console.log('  3. Reinicie o Evolution API:');
      console.log('     cd /var/www/adv && docker compose -f docker-compose.prod.yml restart evolution-api\n');
      console.log('─────────────────────────────────────────────');
      setTimeout(() => process.exit(0), 3000);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Desconectado (logout). Rode o script novamente.');
        process.exit(1);
      } else {
        console.log('⚠️  Conexão fechada, tentando novamente...');
        connect();
      }
    }
  });
}

// Check for qrcode-terminal dependency
try {
  require.resolve('qrcode-terminal');
} catch {
  console.log('Instalando dependência qrcode-terminal...');
  require('child_process').execSync('npm install qrcode-terminal --no-save', { stdio: 'inherit' });
}

console.log('Iniciando conexão WhatsApp (IP local)...\n');
connect().catch(console.error);
