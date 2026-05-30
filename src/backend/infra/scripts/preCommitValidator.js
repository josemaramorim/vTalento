const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TASKS_FILE_PATH = path.join(__dirname, '../../../../specs/08-IMPLEMENTATION-TASKS.md');

function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return output.split('\n').map(f => f.trim()).filter(Boolean);
    } catch (e) {
        console.error('Erro ao verificar arquivos do Git:', e.message);
        return [];
    }
}

function checkActiveTasks() {
    if (!fs.existsSync(TASKS_FILE_PATH)) {
        console.error(`Erro: Arquivo de especificação de tarefas não encontrado em: ${TASKS_FILE_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(TASKS_FILE_PATH, 'utf8');
    
    // Procura por tarefas marcadas como em andamento "[/]" ou tarefas de governança
    const inProgressCount = (content.match(/- \[\/\]/g) || []).length;
    
    return inProgressCount > 0;
}

function main() {
    const stagedFiles = getStagedFiles();
    
    // Regra de Governança Doc-as-Code: Se o código do motor mudar, o manual deve mudar
    const hasMotorChanges = stagedFiles.some(file => 
        file.includes('MotorImportacaoProgramavelService.js')
    );
    const hasManualChanges = stagedFiles.some(file => 
        file.includes('motor-importacao-manual.md')
    );

    if (hasMotorChanges && !hasManualChanges) {
        console.error('\n================================================================');
        console.error('❌ ERRO DE GOVERNANÇA: COMMIT REJEITADO (Doc-as-Code)!');
        console.error('Você alterou o código do motor de importação programável');
        console.error('("MotorImportacaoProgramavelService.js"), mas não atualizou o');
        console.error('manual de sintaxe e autoria em "docs/motor-importacao-manual.md".');
        console.error('\nLEI DE GOVERNANÇA DOC-AS-CODE:');
        console.error('Qualquer alteração no núcleo interpretador do motor exige a revisão/atualização');
        console.error('do manual técnico correspondente para evitar a obsolescência da documentação.');
        console.error('================================================================\n');
        process.exit(1);
    }

    // Se não há arquivos de código modificados, permite o commit
    const hasSourceChanges = stagedFiles.some(file => 
        (file.startsWith('src/') && (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')))
    );

    if (!hasSourceChanges) {
        process.exit(0);
    }

    // Se modificou código, exige tarefa ativa física
    const hasActiveTask = checkActiveTasks();
    
    if (!hasActiveTask) {
        console.error('\n================================================================');
        console.error('❌ ERRO DE GOVERNANÇA: COMMIT REJEITADO!');
        console.error('Nenhuma tarefa física está marcada como "Em Andamento" [/]');
        console.error('no arquivo: specs/08-IMPLEMENTATION-TASKS.md.');
        console.error('\nLEI MÁXIMA DA GOVERNANÇA:');
        console.error('Você não pode alterar código sem atualizar a especificação física!');
        console.error('Marque a tarefa correspondente com - [/] antes de commitar.');
        console.error('================================================================\n');
        process.exit(1);
    }

    console.log('✔️ Validação de governança de especificações físicas: APROVADA!');
    process.exit(0);
}

main();
