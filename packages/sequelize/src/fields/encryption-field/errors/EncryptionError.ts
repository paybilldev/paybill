export class EncryptionError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EncryptionError';
  }
}
