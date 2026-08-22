export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Set when the action produced something the UI should show once, e.g. a temporary password. */
  notice?: string;
};

export const idle: ActionState = { ok: false };

export const failure = (message: string, errors?: Record<string, string>): ActionState => ({
  ok: false,
  message,
  errors,
});

export const success = (message?: string, notice?: string): ActionState => ({ ok: true, message, notice });
