/** Incremental SSE decoder. Comments count as activity; unknown events are ignored.
 * Bounded frame/line size protects a long-lived connection from unbounded input.
 */
export function createSseParser(onSale: () => void, onActivity: () => void) {
  const decoder = new TextDecoder();
  let buffer = '';
  let event = '';
  let data: string[] = [];
  let size = 0;
  function line(value: string) {
    size += value.length;
    if (size > 65_536) throw new Error('SSE frame too large');
    if (value === '') {
      if (event === 'sales-changed' && data.length) {
        const body: unknown = JSON.parse(data.join('\n'));
        if (
          typeof body !== 'object' ||
          body === null ||
          Array.isArray(body) ||
          Object.keys(body).length
        )
          throw new Error('Invalid invalidation');
        onSale();
      }
      event = '';
      data = [];
      size = 0;
      return;
    }
    if (value.startsWith(':')) return;
    const colon = value.indexOf(':');
    const field = colon < 0 ? value : value.slice(0, colon);
    let content = colon < 0 ? '' : value.slice(colon + 1);
    if (content.startsWith(' ')) content = content.slice(1);
    if (field === 'event') event = content;
    else if (field === 'data') data.push(content);
  }
  return {
    push(bytes: Uint8Array) {
      if (bytes.length) onActivity();
      buffer += decoder.decode(bytes, { stream: true });
      while (true) {
        const match = /[\r\n]/.exec(buffer);
        if (!match) break;
        const index = match.index;
        // Hold trailing CR until the following chunk (possibly LF).
        if (buffer[index] === '\r' && index === buffer.length - 1) break;
        const width = buffer.slice(index, index + 2) === '\r\n' ? 2 : 1;
        line(buffer.slice(0, index));
        buffer = buffer.slice(index + width);
      }
      if (buffer.length > 65_536) throw new Error('SSE line too large');
    },
  };
}
