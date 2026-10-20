import { SalesError } from './contract.provisional';

const prefix = 'kofi:sales:demo:pending:';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Only opaque UUIDs, separated from future real-operation references. */
export function createOperationReferences(storage: Storage) {
  return {
    references() {
      try {
        return Array.from({ length: storage.length }, (_, index) =>
          storage.key(index),
        )
          .filter(
            (key): key is string =>
              !!key &&
              key.startsWith(prefix) &&
              uuid.test(key.slice(prefix.length)),
          )
          .map((key) => key.slice(prefix.length));
      } catch {
        throw new SalesError(
          'storage',
          'No se puede leer la referencia de recuperación. Habilita el almacenamiento del navegador antes de continuar.',
        );
      }
    },
    remember(operationId: string) {
      try {
        if (!uuid.test(operationId)) throw new Error('Invalid UUID');
        storage.setItem(prefix + operationId, operationId);
        if (storage.getItem(prefix + operationId) !== operationId)
          throw new Error('Unavailable storage');
      } catch {
        throw new SalesError(
          'storage',
          'No se pudo conservar la referencia de recuperación. No se envió el registro; habilita el almacenamiento y vuelve a intentarlo.',
        );
      }
    },
    acknowledge(operationId: string) {
      try {
        storage.removeItem(prefix + operationId);
      } catch {
        throw new SalesError(
          'storage',
          'El resultado está confirmado, pero no se pudo retirar su referencia local. Puedes volver a comprobarla.',
        );
      }
    },
  };
}
