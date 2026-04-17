export type RegistrationField = "username" | "email" | "password";

export interface FieldValidationRules {
  required?: boolean;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  title?: string;
}

export type RegistrationFormRules = Partial<
  Record<RegistrationField, FieldValidationRules>
>;

export interface RegistrationFormSession {
  rules: RegistrationFormRules;
}

export class RegistrationFormRulesService {
  async loadSession(): Promise<RegistrationFormSession> {
    return {
      rules: {
        username: {
          required: true,
          minlength: 3,
          maxlength: 20,
          title: "Obligatorio. De 3 a 20 caracteres.",
        },
        email: {
          required: true,
          maxlength: 60,
          pattern: "[^\\s@]+@[^\\s@]+\\.[^\\s@]+",
          title: "Obligatorio. Usa un email tipo nombre@dominio.com.",
        },
        password: {
          required: true,
          minlength: 8,
          maxlength: 64,
          title: "Obligatorio. De 8 a 64 caracteres.",
        },
      },
    };
  }
}
