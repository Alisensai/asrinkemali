export class RevisionConflictError extends Error {
  constructor() {
    super("Kayıt başka bir kullanıcı tarafından güncellendi; en son sürümü yükleyip tekrar deneyin.");
    this.name = "RevisionConflictError";
  }
}

export function assertExpectedRevision(expected: string, actual: string): void {
  if (!expected || !actual || expected !== actual) throw new RevisionConflictError();
}
