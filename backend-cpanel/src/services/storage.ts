import fs from 'fs';
import path from 'path';

const CONTRACTS_FILE = path.join(process.cwd(), 'contracts.json');
export let contracts: any[] = [];

export function loadContracts() {
  try {
    if (fs.existsSync(CONTRACTS_FILE)) {
      const content = fs.readFileSync(CONTRACTS_FILE, 'utf-8').trim();
      if (content) {
        contracts = JSON.parse(content);
        console.log(`[Storage] ${contracts.length} contratos carregados.`);
      }
    }
  } catch (e) {
    console.error('[Storage] Erro ao carregar contratos.json:', e);
    contracts = [];
  }
}

export function saveContracts() {
  try {
    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contracts, null, 2));
  } catch (e) {
    console.error('[Storage] Erro ao salvar contratos.json:', e);
  }
}

// Inicializa no carregamento do módulo
loadContracts();
