/**
 * whatsapp-web.js surfaces WhatsApp Web's own internal JS errors verbatim (e.g. "No
 * LID for user", raised deep inside WhatsApp's minified frontend code) — meaningless
 * to an end user. Translates the common cases into an actionable message in Portuguese;
 * falls back to the raw message for anything unrecognized rather than hiding it.
 */
export function translateWhatsappSendError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/No LID for user/i.test(message)) {
    return "Este número não está registrado no WhatsApp (ou o formato está incorreto). Verifique o telefone e tente novamente.";
  }
  if (/wid error|invalid wid/i.test(message)) {
    return "Número de telefone inválido para o WhatsApp.";
  }
  if (/Evaluation failed|Protocol error|Target closed/i.test(message)) {
    return "A conexão com o WhatsApp foi perdida. Reconecte em Configurações → Integrações e tente novamente.";
  }
  if (/browser is already running|userDataDir/i.test(message)) {
    return "Já existe uma conexão em andamento. Aguarde alguns segundos ou clique em \"Limpar sessão\" se o problema persistir.";
  }

  return message;
}
