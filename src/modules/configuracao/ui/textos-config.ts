import type { LocaleId } from '../../shared/ui/locale.js';

const PT = {
  titulo: 'Configurações',
  temaSecao: 'Tema visual',
  temaAjuda: 'Um botão na barra superior e outro aqui: cada clique passa por claro, escuro e breu tático (superfícies e accent da marca).',
  temaAtual: 'Tema atual',
  idiomaSecao: 'Idioma da interface',
  idiomaDescricao:
    'O inglês está disponível para navegação e Wave 1; outras fatias continuam só em pt-BR por agora.',
  idiomaPt: 'Português (Brasil)',
  idiomaEn: 'English',
  pinSecao: 'Cofre PIN (cópia de segurança)',
  pinDescricao:
    'Gestão segura da palavra-passe do cofre de documentos ficará disponível quando o fluxo de encriptação estiver ligado ao perfil.',
  pinCampoEtiqueta: 'Definir PIN de backup',
  pinCampoPlaceholder: 'Brevemente',
  backupSecao: 'Backup e restauração',
  backupDescricao: 'Exporta um arquivo .papiro com os dados locais. Sincronização remota fica para etapa futura.',
  exportarBackup: 'Exportar .papiro',
  importarBackup: 'Restaurar .papiro',
  backupOk: 'Backup pronto.',
  restauracaoOk: 'Backup restaurado.',
  panicoSecao: 'Pânico total',
  panicoDescricao: 'Apaga todos os dados locais desta instalação. Digite APAGAR para confirmar.',
  panicoPlaceholder: 'APAGAR',
  panicoBotao: 'Apagar tudo',
  panicoOk: 'Dados locais apagados.',
  guardarIdioma: 'Guardar preferência de idioma',
  appNomeTituloDoc: 'Papiro',
} as const;

const EN = {
  titulo: 'Settings',
  temaSecao: 'Theme',
  temaAjuda: 'One button in the top bar and one here: each click cycles light, dark, and tactical (brand surfaces and accent).',
  temaAtual: 'Current theme',
  idiomaSecao: 'Interface language',
  idiomaDescricao:
    'English applies to navigation and Wave 1 screens; deeper modules remain pt-BR for now.',
  idiomaPt: 'Portuguese (Brazil)',
  idiomaEn: 'English',
  pinSecao: 'Vault PIN (backup)',
  pinDescricao:
    'Secure PIN backup for encrypted documents will be enabled when vault flows connect to profile.',
  pinCampoEtiqueta: 'Backup PIN',
  pinCampoPlaceholder: 'Coming soon',
  backupSecao: 'Backup and restore',
  backupDescricao: 'Exports a .papiro file with local data. Remote sync stays for a future stage.',
  exportarBackup: 'Export .papiro',
  importarBackup: 'Restore .papiro',
  backupOk: 'Backup ready.',
  restauracaoOk: 'Backup restored.',
  panicoSecao: 'Total panic',
  panicoDescricao: 'Deletes all local data in this installation. Type APAGAR to confirm.',
  panicoPlaceholder: 'APAGAR',
  panicoBotao: 'Delete everything',
  panicoOk: 'Local data deleted.',
  guardarIdioma: 'Save language preference',
  appNomeTituloDoc: 'Papiro',
} as const;

export type TextosConfig = typeof PT;

export function obterTextosConfig(locale: LocaleId): TextosConfig {
  return (locale === 'en' ? EN : PT) as TextosConfig;
}
