import { PrismaClient, TipoPessoa, StatusCliente, LeadTemperatura } from '../src/generated/prisma'

const prisma = new PrismaClient()

const firstNames = ['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro', 'Quintiliano', 'Rafael', 'Sofia', 'Thiago', 'Ursula', 'Vicente', 'Wagner', 'Xuxa', 'Yuri', 'Zelia'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomCpf(): string {
    const num = () => Math.floor(Math.random() * 10);
    return `${num()}${num()}${num()}.${num()}${num()}${num()}.${num()}${num()}${num()}-${num()}${num()}`;
}

function generateRandomPhone(): string {
    const num = () => Math.floor(Math.random() * 10);
    return `(11) 9${num()}${num()}${num()}${num()}-${num()}${num()}${num()}${num()}`;
}

async function main() {
    console.log('Criando 20 clientes demo...');

    let createdCount = 0;

    // Create 20 clients
    for (let i = 0; i < 20; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const name = `${firstName} ${lastName} (Demo ${i + 1})`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@exemplo.com`;

        try {
            await prisma.cliente.create({
                data: {
                    nome: name,
                    email: email,
                    cpf: generateRandomCpf(),
                    telefone: generateRandomPhone(),
                    celular: generateRandomPhone(),
                    whatsapp: generateRandomPhone(),
                    tipoPessoa: TipoPessoa.FISICA,
                    status: getRandomItem(Object.values(StatusCliente)),
                    temperatura: getRandomItem(Object.values(LeadTemperatura)),
                    cidade: 'São Paulo',
                    estado: 'SP'
                }
            });
            createdCount++;
        } catch (error) {
            console.error(`Erro ao criar cliente ${name}:`, error);
        }
    }

    console.log(`✅ ${createdCount} clientes criados com sucesso!`);
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
