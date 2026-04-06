export class NodError extends Error {
  constructor(
    public override message: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'NodError';
  }
}

export class NotFoundError extends NodError {
  constructor(id: string) {
    super(`Task not found: ${id}`, 2);
    this.name = 'NotFoundError';
  }
}

export class NotInProjectError extends NodError {
  constructor() {
    super('Not a nod project. Run `nod init` first.', 1);
    this.name = 'NotInProjectError';
  }
}

export class ValidationError extends NodError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'ValidationError';
  }
}
